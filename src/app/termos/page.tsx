import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Termos de Uso | Economizei",
  description: "Termos e Condições de Uso da plataforma Economizei.",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between pt-24">
      <main className="max-w-[900px] mx-auto px-6 py-8 flex-1 w-full text-zinc-300 font-sans">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Voltar para o início
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <FileText size={24} weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Termos de Uso
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Última atualização: Outubro de 2026
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-zinc-300 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 md:p-8">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar a plataforma <strong>Economizei</strong> (https://economizei.ftech-apps.com.br), você concorda integralmente com estes Termos de Uso. Caso não concorde com qualquer disposição aqui apresentada, pedimos que não continue utilizando nosso serviço.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Natureza do Serviço</h2>
            <p>
              O <strong>Economizei</strong> é um portal agregador e curador de promoções, ofertas e cupons de desconto. Nós não vendemos diretamente os produtos nem atuamos como intermediários de pagamento ou logística.
            </p>
            <p className="text-zinc-400">
              Todas as transações, compras, faturamentos, entregas e garantias são de exclusiva responsabilidade das lojas parceiras anunciadas (como Amazon, Mercado Livre, Shopee, AliExpress, KaBuM!, Magazine Luiza, etc.).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Preços, Estoque e Cupons</h2>
            <p>
              Os preços e a disponibilidade dos produtos divulgados estão sujeitos a alterações dinâmicas e sem aviso prévio por parte das lojas vendedoras. Cupons promocionais podem ter validade limitada ou atingir o limite de utilizações estipulado pelo anunciante a qualquer momento.
            </p>
            <p className="text-zinc-400">
              Recomendamos sempre conferir o valor final e as regras do cupom diretamente na tela de checkout da loja parceira antes de finalizar qualquer pagamento.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Propriedade Intelectual</h2>
            <p>
              A marca, logotipo, identidade visual e códigos do Economizei são de nossa propriedade ou licenciados para nosso uso. Nomes de lojas, logotipos de terceiros e marcas registradas citadas pertencem aos seus respectivos proprietários e são utilizados apenas com fins informativos de indicação de ofertas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">5. Limitação de Responsabilidade</h2>
            <p>
              O Economizei empenha seus melhores esforços para manter as informações corretas e atualizadas. No entanto, não nos responsabilizamos por divergências de preços decorrentes de atrasos de atualização das lojas parceiras, produtos esgotados ou descontinuidade de campanhas promocionais externas.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
