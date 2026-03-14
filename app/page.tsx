import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <MainLayout>
      <section className="grid gap-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-lg shadow-black/20 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="inline-flex rounded-full border border-cyan-900/60 bg-cyan-950/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
            Digital Benefits Platform
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-100 sm:text-5xl">
            Find the Best Insurance Plan for You
          </h1>
          <p className="text-base leading-7 text-neutral-300 sm:text-lg">
            Compare insurance plans side-by-side, review premiums and coverage in minutes, and
            make confident enrollment decisions.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Why teams use InsurTech API Hub</CardTitle>
            <CardDescription>One workspace for selection, quoting, and enrollment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-300">
            <p>Compare plans across providers without switching tools.</p>
            <p>Generate quotes faster with standardized data flow.</p>
            <p>Streamline enrollment and keep policy progress visible.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Compare insurance plans easily</CardTitle>
            <CardDescription>Review benefits, exclusions, and costs in one place.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Get instant quotes</CardTitle>
            <CardDescription>Generate quotes quickly for faster decisions.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Simple enrollment process</CardTitle>
            <CardDescription>Move from plan choice to policy activation smoothly.</CardDescription>
          </CardHeader>
        </Card>
      </section>
    </MainLayout>
  );
}
