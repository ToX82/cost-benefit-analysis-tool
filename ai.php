<?php

// Funzione per interfacciarsi con l'API Perplexity
function analyzeWithPerplexity($data, $apiKey, $model): mixed
{
    $curl = curl_init();
    curl_setopt_array($curl, array(
        CURLOPT_URL => "https://api.perplexity.ai/chat/completions",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "POST",
        CURLOPT_POSTFIELDS => json_encode([
            "model" => $model,
            "messages" => [
                ["role" => "system", "content" => "Sei un esperto analista di progetti software. Fornisci analisi concise e mirate, evitando dettagli superflui. Usa ESATTAMENTE il formato Markdown richiesto."],
                ["role" => "user", "content" => getPrompt() . "\n\nDati del progetto:\n" . json_encode($data)]
            ]
        ]),
        CURLOPT_HTTPHEADER => array(
            "Authorization: Bearer " . $apiKey,
            "Content-Type: application/json"
        ),
    ));

    $response = curl_exec($curl);
    curl_close($curl);
    return $response;
}

// Funzione per interfacciarsi con l'API OpenAI
function analyzeWithOpenAI($data, $apiKey, $model): mixed
{
    $url = $model === 'o1'
        ? "https://api.openai.com/v1/engines/o1/completions"
        : "https://api.openai.com/v1/chat/completions";

    $postFields = $model === 'o1'
        ? [
            "prompt" => "Sei un esperto analista di progetti software. Fornisci analisi concise e mirate, evitando dettagli superflui. Usa ESATTAMENTE il formato Markdown richiesto.\n\nDati del progetto:\n" . json_encode($data),
            "max_tokens" => 700,
        ]
        : [
            "model" => $model,
            "messages" => [
                ["role" => "system", "content" => "Sei un esperto analista di progetti software. Fornisci analisi concise e mirate, evitando dettagli superflui. Usa ESATTAMENTE il formato Markdown richiesto."],
                ["role" => "user", "content" => "Dati del progetto:\n" . json_encode($data)],
            ],
            "max_tokens" => $model === 'gpt-4o' ? 700 : 1000
        ];

    $curl = curl_init();
    curl_setopt_array($curl, array(
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "POST",
        CURLOPT_POSTFIELDS => json_encode($postFields),
        CURLOPT_HTTPHEADER => array(
            "Authorization: Bearer " . $apiKey,
            "Content-Type: application/json"
        ),
    ));

    $response = curl_exec($curl);
    curl_close($curl);
    return $response;
}

// Prompt di esempio strutturato
function getPrompt(): string
{
    return "Analizza questi dati e fornisci una valutazione concisa del progetto software." .
           "Non ripetere i dati del progetto, che conosco già, ma fornisci una valutazione generale basata su quei dati." .
           "La risposta deve essere strutturata in questo formato Markdown:\n\n" .
           "## Punti di forza\n" .
           "- punto 1\n" .
           "- punto 2\n" .
           "- punto 3\n\n" .
           "## Criticità\n" .
           "- punto 1\n" .
           "- punto 2\n" .
           "- punto 3\n\n" .
           "## Suggerimenti\n" .
           "- punto 1\n" .
           "- punto 2\n" .
           "- punto 3\n\n" .
           "## Valutazione generale\n" .
           "1-2 frasi di valutazione complessiva\n\n" .
           "Nota: mantieni la risposta concisa, massimo 3 punti per sezione.";
}

// Funzione principale per gestire l'analisi
function analyze($data): mixed
{
    $provider = $_SERVER['HTTP_X_PROVIDER'] ?? null;

    if (!$provider) {
        http_response_code(400);
        return json_encode(['error' => 'Provider AI non specificato']);
    }

    if ($provider === 'perplexity') {
        $apiKey = $_SERVER['HTTP_X_PERPLEXITY_KEY'] ?? null;
        $model = $_SERVER['HTTP_X_PERPLEXITY_MODEL'] ?? null;

        if (!$apiKey || !$model) {
            http_response_code(400);
            return json_encode(['error' => 'Configurazione Perplexity mancante']);
        }

        $response = analyzeWithPerplexity($data, $apiKey, $model);
    } else if ($provider === 'openai') {
        $apiKey = $_SERVER['HTTP_X_OPENAI_KEY'] ?? null;
        $model = $_SERVER['HTTP_X_OPENAI_MODEL'] ?? null;

        if (!$apiKey || !$model) {
            http_response_code(400);
            return json_encode(['error' => 'Configurazione OpenAI mancante']);
        }

        $response = analyzeWithOpenAI($data, $apiKey, $model);
    } else {
        http_response_code(400);
        return json_encode(['error' => 'Provider AI non valido']);
    }

    if (!$response) {
        http_response_code(500);
        return json_encode(['error' => 'Errore nella chiamata API']);
    }

    $answer = json_decode($response);
    if (!$answer || !isset($answer->choices[0]->message->content)) {
        http_response_code(500);
        return json_encode(['error' => 'Risposta API non valida: ' . $response]);
    }

    return json_encode(['result' => $answer->choices[0]->message->content]);
}

// Gestione della richiesta
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Dati non validi']);
    exit;
}

echo analyze($input);
