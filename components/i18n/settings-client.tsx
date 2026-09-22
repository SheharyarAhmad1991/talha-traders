"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { PageHeader } from "@/components/i18n/page-header";
import { CrudSection } from "@/components/settings/crud-section";
import { HrEmployeesSection } from "@/components/hr/hr-employees-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Item = { id: string; name: string; phone?: string | null; unit?: string };
type Factory = { id: string; name: string };
type Employee = {
  id: string;
  name: string;
  factoryId: string;
  salaryType: "DAILY" | "MONTHLY";
  salaryAmount: number;
  factory: Factory;
};

export function SettingsClient({
  dealers,
  workers,
  materials,
  products,
  hrFactories,
  hrEmployees,
}: {
  dealers: Item[];
  workers: Item[];
  materials: Item[];
  products: Item[];
  hrFactories: Factory[];
  hrEmployees: Employee[];
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <PageHeader titleKey="settings" descriptionKey="settingsDesc" />

      <Tabs defaultValue="dealers">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="dealers">{t("dealers")}</TabsTrigger>
          <TabsTrigger value="workers">{t("workersLabor")}</TabsTrigger>
          <TabsTrigger value="materials">{t("rawMaterials")}</TabsTrigger>
          <TabsTrigger value="products">{t("finishedProducts")}</TabsTrigger>
          <TabsTrigger value="hr-factories">{t("addFactories")}</TabsTrigger>
          <TabsTrigger value="hr-employees">
            {t("addFactoriesEmployees")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dealers" className="mt-4">
          <CrudSection
            title={t("dealers")}
            description="Add and manage dealer names and phone numbers."
            endpoint="/api/dealers"
            items={dealers}
            fields={[
              { key: "name", label: t("name"), type: "text" },
              { key: "phone", label: "Phone", type: "text" },
            ]}
          />
        </TabsContent>

        <TabsContent value="workers" className="mt-4">
          <CrudSection
            title={t("workersLabor")}
            description="Add and manage workers used in issue and receive forms."
            endpoint="/api/workers"
            items={workers}
            fields={[
              { key: "name", label: t("name"), type: "text" },
              { key: "phone", label: "Phone", type: "text" },
            ]}
          />
        </TabsContent>

        <TabsContent value="materials" className="mt-4">
          <CrudSection
            title={t("rawMaterials")}
            description="Materials with units (e.g. kg, rolls)."
            endpoint="/api/materials"
            items={materials}
            fields={[
              { key: "name", label: t("name"), type: "text" },
              { key: "unit", label: "Unit", type: "text" },
            ]}
          />
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <CrudSection
            title={t("finishedProducts")}
            description="Finished goods with units (e.g. cartons, pieces)."
            endpoint="/api/products"
            items={products}
            fields={[
              { key: "name", label: t("name"), type: "text" },
              { key: "unit", label: "Unit", type: "text" },
            ]}
          />
        </TabsContent>

        <TabsContent value="hr-factories" className="mt-4">
          <CrudSection
            title={t("addFactories")}
            description="Factories used only for HR employees and attendance."
            endpoint="/api/hr/factories"
            items={hrFactories}
            fields={[{ key: "name", label: t("name"), type: "text" }]}
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
