import { prisma } from "@/lib/prisma";
import { CrudSection } from "@/components/settings/crud-section";
import { HrEmployeesSection } from "@/components/hr/hr-employees-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function SettingsPage() {
  const [dealers, workers, materials, products, hrFactories, hrEmployees] =
    await Promise.all([
      prisma.dealer.findMany({ orderBy: { name: "asc" } }),
      prisma.worker.findMany({ orderBy: { name: "asc" } }),
      prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
      prisma.finishedProduct.findMany({ orderBy: { name: "asc" } }),
      prisma.hRFactory.findMany({ orderBy: { name: "asc" } }),
      prisma.hREmployee.findMany({
        include: { factory: true },
        orderBy: { name: "asc" },
      }),
    ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage master data used in dropdown lists across the system.
        </p>
      </div>

      <Tabs defaultValue="dealers">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="dealers">Dealers</TabsTrigger>
          <TabsTrigger value="workers">Workers / Labor</TabsTrigger>
          <TabsTrigger value="materials">Raw Materials</TabsTrigger>
          <TabsTrigger value="products">Finished Products</TabsTrigger>
          <TabsTrigger value="hr-factories">Add Factories</TabsTrigger>
          <TabsTrigger value="hr-employees">Add Factories Employees</TabsTrigger>
        </TabsList>

        <TabsContent value="dealers" className="mt-4">
          <CrudSection
            title="Dealers"
            description="Add and manage dealer names and phone numbers."
            endpoint="/api/dealers"
            items={dealers}
            fields={[
              { key: "name", label: "Name", type: "text" },
              { key: "phone", label: "Phone", type: "text" },
            ]}
          />
        </TabsContent>

        <TabsContent value="workers" className="mt-4">
          <CrudSection
            title="Workers / Labor"
            description="Add and manage workers used in issue and receive forms."
            endpoint="/api/workers"
            items={workers}
            fields={[
              { key: "name", label: "Name", type: "text" },
              { key: "phone", label: "Phone", type: "text" },
            ]}
          />
        </TabsContent>

        <TabsContent value="materials" className="mt-4">
          <CrudSection
            title="Raw Materials"
            description="Materials with units (e.g. kg, rolls)."
            endpoint="/api/materials"
            items={materials}
            fields={[
              { key: "name", label: "Name", type: "text" },
              { key: "unit", label: "Unit", type: "text" },
            ]}
          />
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <CrudSection
            title="Finished Products"
            description="Finished goods with units (e.g. cartons, pieces)."
            endpoint="/api/products"
            items={products}
            fields={[
              { key: "name", label: "Name", type: "text" },
              { key: "unit", label: "Unit", type: "text" },
            ]}
          />
        </TabsContent>

        <TabsContent value="hr-factories" className="mt-4">
          <CrudSection
            title="Add Factories"
            description="Factories used only for HR employees and attendance."
            endpoint="/api/hr/factories"
            items={hrFactories}
            fields={[{ key: "name", label: "Name", type: "text" }]}
          />
        </TabsContent>

        <TabsContent value="hr-employees" className="mt-4">
          <HrEmployeesSection
            factories={hrFactories}
            employees={hrEmployees}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
