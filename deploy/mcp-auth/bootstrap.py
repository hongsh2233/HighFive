#!/usr/bin/env python3
"""Run on the approved HighFive host. Secrets stay outside Git and image contexts."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / '.mcp-auth'
PRIVATE.mkdir(mode=0o700, exist_ok=True)
os.chmod(PRIVATE, 0o700)
STATE = PRIVATE / 'state.json'
RESOURCE = 'https://highfive.exawave.co.kr/api/mcp'
ISSUER = 'https://highfive.exawave.co.kr/mcp-auth/realms/exawave-mcp'

def private_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    os.chmod(path, 0o600)

if STATE.exists():
    state = json.loads(STATE.read_text())
else:
    state = {key: secrets.token_urlsafe(36) for key in ['dbPassword', 'adminPassword', 'operatorPassword', 'clientSecret']}
    state['operatorId'] = str(uuid.uuid4())
    private_json(STATE, state)

# Separate database and login, no grant on HighFive's business database.
def psql(sql, database='postgres'):
    r = subprocess.run(['docker', 'exec', '-i', 'highfive-db', 'psql', '-U', 'highfive', '-d', database, '-v', 'ON_ERROR_STOP=1', '-At'], input=sql, text=True, capture_output=True)
    if r.returncode:
        raise SystemExit('OAuth database provisioning failed (details withheld to avoid credential leakage)')
    return r.stdout.strip()

if psql("SELECT 1 FROM pg_roles WHERE rolname='highfive_mcp_auth';") != '1':
    psql("CREATE ROLE highfive_mcp_auth LOGIN PASSWORD '" + state['dbPassword'] + "';")
if psql("SELECT 1 FROM pg_database WHERE datname='highfive_mcp_auth';") != '1':
    psql('CREATE DATABASE highfive_mcp_auth OWNER highfive_mcp_auth;')

scopes = []
for name, label in [('highfive:read', '업무 및 댓글 조회'), ('highfive:comment', '승인한 댓글·답글·멘션 작성'), ('highfive:task:create', '승인한 업무 생성')]:
    scopes.append({'name': name, 'protocol': 'openid-connect', 'attributes': {'include.in.token.scope': 'true', 'display.on.consent.screen': 'true', 'consent.screen.text': label}})
realm = {
    'realm': 'exawave-mcp', 'enabled': True, 'displayName': 'EXAWAVE · ChatGPT 지아 연결',
    'registrationAllowed': False, 'resetPasswordAllowed': False, 'rememberMe': True, 'sslRequired': 'external',
    'bruteForceProtected': True, 'failureFactor': 5, 'accessTokenLifespan': 300,
    'ssoSessionIdleTimeout': 1800, 'ssoSessionMaxLifespan': 36000,
    'clientScopes': scopes,
    'users': [{'id': state['operatorId'], 'username': 'exawave-owner', 'enabled': True,
               'firstName': 'EXAWAVE', 'lastName': '대표', 'requiredActions': ['UPDATE_PASSWORD'],
               'credentials': [{'type': 'password', 'value': state['operatorPassword'], 'temporary': True}]}],
    'clients': [{'clientId': 'highfive-chatgpt', 'name': '한지아 · ChatGPT', 'protocol': 'openid-connect',
        'enabled': True, 'publicClient': False, 'clientAuthenticatorType': 'client-secret', 'secret': state['clientSecret'],
        'standardFlowEnabled': True, 'directAccessGrantsEnabled': False, 'serviceAccountsEnabled': False,
        'consentRequired': True, 'fullScopeAllowed': False,
        'redirectUris': ['https://chatgpt.com/connector_platform_oauth_redirect'],
        'attributes': {'pkce.code.challenge.method': 'S256'},
        'defaultClientScopes': ['highfive:read'],
        'optionalClientScopes': ['highfive:comment', 'highfive:task:create', 'offline_access'],
        'protocolMappers': [{'name': 'highfive-resource-audience', 'protocol': 'openid-connect', 'protocolMapper': 'oidc-audience-mapper',
            'config': {'included.custom.audience': RESOURCE, 'access.token.claim': 'true', 'id.token.claim': 'false'}}],
    }],
}
private_json(PRIVATE / 'realm.json', realm)
# A file bind mount is readable by the container UID; parent directory stays 0700 on host.
os.chmod(PRIVATE / 'realm.json', 0o644)
auth_env = ROOT / '.env.mcp-auth'
auth_env.write_text('KC_DB_PASSWORD=' + state['dbPassword'] + '\nKC_BOOTSTRAP_ADMIN_USERNAME=mcp-admin\nKC_BOOTSTRAP_ADMIN_PASSWORD=' + state['adminPassword'] + '\n')
os.chmod(auth_env, 0o600)
key_file = Path('/home/hong1234/apps/backup/highfive-mcp-20261016/oauth/service-key.json')
key = json.loads(key_file.read_text())
updates = {
    'HIGHFIVE_MCP_USER_ID': '11', 'HIGHFIVE_MCP_SERVICE_KEY': key['plainKey'],
    'HIGHFIVE_MCP_RESOURCE_URL': RESOURCE, 'HIGHFIVE_MCP_OAUTH_ISSUER': ISSUER,
    'HIGHFIVE_MCP_OAUTH_JWKS_URL': ISSUER + '/protocol/openid-connect/certs',
    'HIGHFIVE_MCP_OAUTH_SUBJECT': state['operatorId'],
    'HIGHFIVE_MCP_ENABLED': 'false', 'HIGHFIVE_MCP_COMMENTS_ENABLED': 'false', 'HIGHFIVE_MCP_TASKS_ENABLED': 'false',
}
env = ROOT / '.env'
seen = set()
lines = []
for line in env.read_text().splitlines():
    key_name = line.split('=', 1)[0] if '=' in line else ''
    if key_name in updates:
        if key_name not in seen:
            lines.append(key_name + '=' + updates[key_name])
            seen.add(key_name)
    else:
        lines.append(line)
lines.extend(k + '=' + v for k, v in updates.items() if k not in seen)
env.write_text('\n'.join(lines) + '\n')
os.chmod(env, 0o600)
print('OAuth database/realm/client and fixed ChatGPT binding prepared. No secrets printed. MCP remains disabled until provider and proxy checks pass.')
