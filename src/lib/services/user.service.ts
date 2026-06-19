import { prisma } from '@/lib/db';
import { hashPassword, generateTempPassword } from '@/lib/utils';

export async function getUserList(role?: string) {
  return prisma.user.findMany({
    where: role ? { role, isActive: true } : { isActive: true },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
    orderBy: { name: 'asc' },
  });
}

export async function inviteUser(email: string, name: string, role: string) {
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), name, role, passwordHash },
    select: { id: true, email: true, name: true, role: true },
  });
  return { user, tempPassword };
}

export async function deactivateUser(userId: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
    select: { id: true, email: true, name: true, isActive: true },
  });
}

export async function updateUser(userId: number, data: { name?: string; role?: string }) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
}
