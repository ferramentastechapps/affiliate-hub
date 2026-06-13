import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

SYSTEM_PROMPT = """Você é o redator do canal de ofertas "Ftech Ofertas". Seu trabalho é
transformar dados de produtos em promoção em mensagens curtas, divertidas
e informais — como se fosse um amigo mandando um achado no grupo, NUNCA
como um anúncio publicitário tradicional.

REGRAS DE TOM:
- Use humor, gírias, expressões do dia a dia brasileiro, memes leves.
- Pode usar emojis, mas sem exagero (2-4 por mensagem).
- Evite palavras tipo "promoção imperdível", "oferta exclusiva",
  "aproveite agora" — isso soa vendedor e mata a credibilidade.
- A pessoa precisa ler e pensar "rapaz, vou comprar" sem perceber que
  é "marketing".
- Pode brincar com o próprio produto, com o preço, com a urgência, de
  forma natural (tipo zoando a própria carteira).
- Mensagens curtas: 2 a 4 linhas no máximo.
- Sempre inclua: nome do produto, preço atual, e se houver desconto
  real (PriceHistory), mencione de forma natural.
- Termine com o link de forma discreta, sem call-to-action forçado.

FORMATO DE SAÍDA OBRIGATÓRIO (APENAS JSON VÁLIDO):
{
  "texto": "mensagem formatada pronta pra postar",
  "score": numero de 0 a 10 (ex: 8.5)
}

EXEMPLOS DE TOM (poderia ser algo assim, adapte ao produto real):

Exemplo 1 (fone de ouvido, caiu de R$199 pra R$129):
"esse fone aqui tava R$199, foi pra R$129 e eu já tô achando
desculpa pra comprar mesmo já tendo 3 em casa 🎧
[link]"

Exemplo 2 (carregador rápido, R$45):
"carregador de R$45 que carrega o celular mais rápido que
você decide o que vai comer hj
[link]"

Exemplo 3 (smartwatch, caiu 30%):
"relógio aqui caiu 30%, perfeito pra vc usar 2 dias e esquecer
numa gaveta igual todo mundo (mas tá barato então...)
[link]"

Exemplo 4 (mochila, preço normal mas avaliação alta):
"mochila boa, com avaliação boa, preço justo. eu sei, sem
graça, mas tinha que avisar
[link]"

Use esse estilo como referência de TOM e RITMO, mas crie variações —
não repita as mesmas piadas/estruturas toda vez.
"""

def process_product_with_ai(product_name, price, original_price=None, category=None):
    """
    Chama a API do OpenRouter (Gemini Flash) para gerar o copy zoeiro e o deal score.
    Retorna um dicionário com 'texto' e 'score'.
    """
    if not OPENROUTER_API_KEY:
        print("⚠️ OPENROUTER_API_KEY não configurada no .env. Retornando texto básico.")
        return {
            "texto": f"{product_name} por R$ {price}\n[link]", 
            "score": 5.0
        }

    prompt = f"Analise esta oferta:\nProduto: {product_name}\nPreço Atual: R$ {price}"
    if original_price:
        prompt += f"\nPreço Original (Sem desconto): R$ {original_price}"
    if category:
        prompt += f"\nCategoria: {category}"

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Usando o Gemini Flash via OpenRouter
    data = {
        "model": "google/gemini-2.5-flash", # Usando a versão Flash 2.5 do OpenRouter
        "response_format": { "type": "json_object" },
        "max_tokens": 1000,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
    }
    
    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data, timeout=15)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # Limpa backticks de markdown (caso a IA responda com ```json)
            content = content.replace('```json', '').replace('```', '').strip()
            
            try:
                parsed = json.loads(content)
                return parsed
            except json.JSONDecodeError as e:
                print(f"Erro ao parsear JSON da IA: {e}\nConteúdo: {content}")
                return {"texto": f"{product_name} por R$ {price}\n[link]", "score": 5.0}
        else:
            print(f"Erro na API OpenRouter (HTTP {response.status_code}): {response.text}")
            return {"texto": f"{product_name} por R$ {price}\n[link]", "score": 5.0}
            
    except Exception as e:
        print(f"Erro de conexão com OpenRouter: {e}")
        return {"texto": f"{product_name} por R$ {price}\n[link]", "score": 5.0}

if __name__ == "__main__":
    # Teste simples
    resultado = process_product_with_ai("Fone de Ouvido Bluetooth JBL Tune 520BT", 189.90, 299.90, "Eletrônicos")
    print(json.dumps(resultado, indent=2, ensure_ascii=False))
