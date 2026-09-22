import { prisma } from "@/lib/prisma";
import { AttendanceClient } from "@/components/hr/attendance-client";

export default async function AttendancePage() {
  const factories = await prisma.hRFactory.findMany({
    orderBy: { name: "asc" },
  });

  return <AttendanceClient factories={factories} />;
}
