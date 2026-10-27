import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Política de Privacidade | Economizei",
  description: "Política de Privacidade e Proteção de Dados do Economizei em conformidade com a LGPD.",
  alternates: {
    canonical: "https://economizei.ftech-apps.com.br/privacidade",
  },
};

const privacyJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Política de Privacidade | Economizei",
  "description": "Política de Privacidade e Proteção de Dados do Economizei em conformidade com a LGPD.",
  "url": "https://economizei.ftech-apps.com.br/privacidade",
  "inLanguage": "pt-BR",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(privacyJsonLd) }}
      />
      <main className="max-w-[900px] mx-auto px-6 py-8 flex-1 w-full text-zinc-300 font-sans">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Voltar para o início
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <ShieldCheck size={24} weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Política de Privacidade
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Última atualização: Outubro de 2026
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-zinc-300 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 md:p-8">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Visão Geral</h2>
            <p>
              O <strong>Economizei</strong> (disponível em{" "}
              <span className="text-orange-400">https://economizei.ftech-apps.com.br</span>)
              preza pela privacidade, transparência e segurança de todos os seus usuários.
              Esta Política de Privacidade explica de forma clara como tratamos, coletamos e protegemos seus dados ao utilizar nossa plataforma, em total conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Dados que Coletamos</h2>
            <p>
              Coletamos a menor quantidade de dados possível para proporcionar uma boa experiência:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>
                <strong>Dados de navegação anônimos:</strong> Endereço IP aproximado, tipo de dispositivo, navegador e páginas visitadas para fins analíticos de desempenho e melhoria da plataforma.
              </li>
              <li>
                <strong>Cookies e identificadores locais:</strong> Armazenamento local (localStorage) no seu navegador para salvar preferências como lista de desejos (favoritos) e tema visual, sem rastrear sua identidade pessoal.
              </li>
              <li>
                <strong>Autenticação (opcional):</strong> Caso opte por efetuar login (via Google ou credenciais), tratamos nome de exibição e e-mail exclusivamente para gerenciar seus alertas e sincronizar seus favoritos.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Links de Afiliados e Redirecionamentos</h2>
            <p>
              O <strong>Economizei</strong> é uma plataforma agregadora de ofertas e cupons de desconto. Ao clicar em um link ou botão de compra (&ldquo;Ver Oferta&rdquo;, &ldquo;Pegar Cupom&rdquo;), você pode ser redirecionado para sites parceiros e redes de afiliados (como Amazon, Mercado Livre, Shopee, AliExpress, Magazine Luiza, entre outros).
            </p>
            <p className="text-zinc-400">
              Podemos receber uma comissão quando você realiza uma compra através de nossos links de afiliados, sem nenhum custo adicional para você. Cada parceiro externo possui suas próprias políticas de privacidade e termos de uso independentes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Uso de Cookies e Tecnologias de Terceiros</h2>
            <p>
              Utilizamos cookies estritamente necessários para o funcionamento e estabilidade da aplicação, além de ferramentas analíticas para medir o volume de acessos e cliques em cupons. Você pode a qualquer momento desativar cookies nas configurações do seu navegador.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">5. Compartilhamento de Dados</h2>
            <p>
              Nós <strong>nunca vendemos, alugamos ou comercializamos</strong> dados pessoais de nossos visitantes com terceiros. Dados só podem ser compartilhados por estrita exigência legal ou ordens judiciais emitidas por autoridades competentes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">6. Seus Direitos (LGPD)</h2>
            <p>
              Você tem total controle sobre seus dados. De acordo com a LGPD, você tem direito a confirmar a existência de tratamento, acessar dados cadastrados, solicitar correção de dados incompletos ou requerer a exclusão de sua conta a qualquer momento.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">7. Contato e Encarregado</h2>
            <p>
              Para dúvidas, solicitações sobre privacidade ou exercício de direitos dos titulares de dados, entre em contato com nosso time através dos canais de suporte ou pela nossa comunidade oficial informada no rodapé.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
