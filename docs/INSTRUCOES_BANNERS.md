# 📸 Como Salvar os Banners

## Passo a Passo

### 1. Criar a pasta (se não existir)
```bash
mkdir -p public/banners
```

### 2. Salvar cada imagem

Você me enviou 5 imagens. Salve cada uma com o nome correspondente:

#### Banner 1: LG Member Days (vermelho)
- **Salvar como:** `public/banners/lg-memberdays.jpg`
- **Descrição:** Banner vermelho com produtos LG (geladeira, lavadora, TV)
- **Texto:** "Até 60% OFF pa você"

#### Banner 2: Netshoes (roxo)
- **Salvar como:** `public/banners/netshoes.jpg`
- **Descrição:** Banner roxo com tênis coloridos e camisa do Flamengo
- **Texto:** "Cupom de até 15% OFF"

#### Banner 3: Elets Cadeiras (cinza)
- **Salvar como:** `public/banners/elets-cadeiras.jpg`
- **Descrição:** Banner cinza com 3 cadeiras de escritório
- **Texto:** "Cadeiras com 8%FF aplicando cupom exclusivo"

#### Banner 4: Samsung Aniversário (azul)
- **Salvar como:** `public/banners/samsung-aniversario.jpg`
- **Descrição:** Banner azul com celular Samsung
- **Texto:** "Aniversário Samsung com até 50% OFF + Parcele em até 18x"

#### Banner 5: AliExpress Outono (laranja/amarelo)
- **Salvar como:** `public/banners/aliexpress-outono.jpg`
- **Descrição:** Banner laranja/amarelo com roupas e acessórios
- **Texto:** "Saldão de Outono 70% OFF"

## 🎯 Resultado Final

Após salvar todas as imagens, sua estrutura ficará assim:

```
public/
  └── banners/
      ├── lg-memberdays.jpg          ✅
      ├── netshoes.jpg               ✅
      ├── elets-cadeiras.jpg         ✅
      ├── samsung-aniversario.jpg    ✅
      └── aliexpress-outono.jpg      ✅
```

## 🧪 Testar

Após salvar as imagens, acesse a página inicial e você verá:

1. **Carrossel de banners** logo abaixo dos botões de redes sociais
2. **Setas de navegação** para navegar entre os banners
3. **Indicadores (dots)** na parte inferior
4. **Hover effect** ao passar o mouse
5. **Clique** para ir até a seção de ofertas

## 🔍 Verificar se Funcionou

Execute o projeto:

```bash
npm run dev
```

Acesse: `http://localhost:3000`

Se as imagens não aparecerem:
- Verifique se os nomes dos arquivos estão corretos
- Verifique se estão na pasta `public/banners/`
- Limpe o cache do navegador (Ctrl + Shift + R)
- Reinicie o servidor de desenvolvimento

## 📝 Notas Importantes

- Os nomes dos arquivos devem ser **exatamente** como especificado
- Use **letras minúsculas** e **hífens** (não underscores)
- Formato **JPG** é preferível (menor tamanho)
- Se usar PNG, certifique-se de otimizar o tamanho

## ✨ Funcionalidades Implementadas

✅ Carrossel automático com navegação
✅ Animações suaves de transição
✅ Indicadores de posição (dots)
✅ Hover effect com informações
✅ Clique para navegar até ofertas
✅ Responsivo (mobile e desktop)
✅ Acessibilidade (aria-labels)

## 🎨 Personalização

Para alterar os banners, edite o arquivo:
`src/components/BannersCarousel.tsx`

Procure pelo array `banners` e modifique conforme necessário.
