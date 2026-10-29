#!/bin/bash
echo "Criando payload fake gigante (simulando a árvore do Molor)..."

# Cria um JSON com um contexto gigante simulando os 1700 tokens da Athena
# (Vamos colocar uma string imensa no prompt)
PROMPT="Voce e Molor. "
for i in {1..800}; do
  PROMPT="${PROMPT} regra de fisica $i; "
done

cat <<JSON > fake_payload.json
{
  "model": "qwen2.5:0.5b",
  "prompt": "$PROMPT",
  "stream": false,
  "options": {
    "temperature": 0.1,
    "num_thread": 1
  }
}
JSON

echo "Enviando para o Ollama... (Vamos medir o tempo)"
time curl -s -X POST http://127.0.0.1:11434/api/generate -H "Content-Type: application/json" -d @fake_payload.json | head -c 100
echo ""
echo "Fim."
