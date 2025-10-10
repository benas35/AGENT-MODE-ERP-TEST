import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { usePortalSession } from "../hooks/usePortalSession";

const schema = z.object({
  email: z.string().email("Įveskite galiojantį el. pašto adresą"),
  workOrderNumber: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export const PortalLoginForm = () => {
  const { requestMagicLink, status } = usePortalSession();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      workOrderNumber: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    await requestMagicLink({
      email: values.email,
      workOrderNumber: values.workOrderNumber || undefined,
    });
  };

  const isLoading = status === "requesting";

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Klientų portalas</CardTitle>
        <CardDescription>
          Įveskite savo el. paštą. Išsiųsime vienkartinę nuorodą peržiūrėti darbo užsakymą ir patvirtinti papildomus darbus.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>El. paštas</FormLabel>
                  <Input type="email" placeholder="vardas@klientas.lt" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workOrderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Darbo užsakymo numeris (nebūtina)</FormLabel>
                  <Input placeholder="WO-2025-1001" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <LoadingButton type="submit" isLoading={isLoading} className="w-full">
              Siųsti prisijungimo nuorodą
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
