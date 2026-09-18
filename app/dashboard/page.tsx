import Link from "next/link";
import { format } from "date-fns";
import {
  ShoppingCart,
  ArrowRightLeft,
  PackageCheck,
  Warehouse,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function DashboardHomePage() {
  const [factoryStock, workerStock, recentLogs, dealerCount, workerCount] =
    await Promise.all([
      prisma.factoryInventory.findMany({
        include: { rawMaterial: true },
        orderBy: { rawMaterial: { name: "asc" } },
      }),
      prisma.workerInventory.findMany({
        where: { quantity: { gt: 0 } },
        include: { worker: true, rawMaterial: true },
        orderBy: { quantity: "desc" },
        take: 10,
      }),
      prisma.transactionLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.dealer.count(),
      prisma.worker.count(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard Home
        </h2>
        <p className="text-sm text-muted-foreground">
          Running material balances and recent activity for Umer Traders.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Factory materials</CardDescription>
            <CardTitle className="text-3xl">
              {factoryStock.filter((s) => s.quantity > 0).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Warehouse className="size-4" />
            Items with stock
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Worker balances</CardDescription>
            <CardTitle className="text-3xl">{workerStock.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            Active material lines
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dealers</CardDescription>
            <CardTitle className="text-3xl">{dealerCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Workers</CardDescription>
            <CardTitle className="text-3xl">{workerCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/purchase">
          <Button>
            <ShoppingCart data-icon="inline-start" />
            Purchase Material
          </Button>
        </Link>
        <Link href="/dashboard/issue">
          <Button variant="outline">
            <ArrowRightLeft data-icon="inline-start" />
            Issue to Worker
          </Button>
        </Link>
        <Link href="/dashboard/receive">
          <Button variant="outline">
            <PackageCheck data-icon="inline-start" />
            Receive Product
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Factory Inventory</CardTitle>
            <CardDescription>Current stock at factory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {factoryStock.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No factory stock yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    factoryStock.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.rawMaterial.name}</TableCell>
                        <TableCell className="text-right">
                          {row.quantity} {row.rawMaterial.unit}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Worker Material Balances</CardTitle>
            <CardDescription>Top pending balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workerStock.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No worker balances yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    workerStock.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.worker.name}</TableCell>
                        <TableCell>{row.rawMaterial.name}</TableCell>
                        <TableCell className="text-right">
                          {row.quantity} {row.rawMaterial.unit}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest transaction logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No transactions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.type === "PURCHASE" &&
                          `${log.dealerName} · ${log.rawMaterialName} · ${log.quantity}`}
                        {log.type === "ISSUE" &&
                          `${log.workerName} · ${log.rawMaterialName} · ${log.quantity}`}
                        {log.type === "RECEIVE" &&
                          `${log.workerName} · ${log.finishedProductName} · ${log.quantity}`}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
