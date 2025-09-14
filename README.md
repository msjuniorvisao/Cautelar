# Vistoria Expo (with watermark)

Protótipo em Expo para captura de fotos de vistoria com **marca d'água (canto inferior direito)** aplicada *como tentativa* usando `expo-image-manipulator`. 
O projeto também gera um PDF (via `expo-print`) onde, como fallback, o texto de identificação também é sobreposto às imagens no PDF caso a aplicação direta da marca d'água em imagem falhe por versão.

## Como testar rápido

1. Instale o Expo CLI se ainda não tiver: `npm install -g expo-cli`
2. Extraia o ZIP e entre na pasta do projeto.
3. Rode `npm install` ou `yarn`.
4. `expo start` e abra no seu aparelho usando Expo Go (recomendado para testes de câmera).
5. Permita câmera e localização quando o app solicitar.

## Observações técnicas importantes
- A técnica utilizada para aplicar a marca d'água cria um SVG data URI com o texto do carimbo e tenta 'compor' essa imagem sobre a foto com `expo-image-manipulator` — isso funciona em muitas versões do SDK, mas há variação entre versões do Expo/ImagemManupulator. Caso o overlay não funcione em seu ambiente, o PDF final ainda conterá o carimbo como fallback.
- Dependências listadas em `package.json` são sugestões compatíveis com SDK ~48. Ajuste versões conforme seu ambiente.

Se quiser, eu posso:
- Ajustar a posição/tamanho do carimbo
- Gerar OCR automático do odômetro
- Subir para um repositório GitHub e configurar CI/CD para builds
