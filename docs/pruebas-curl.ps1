$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$reportPath = Join-Path $PSScriptRoot 'pruebas-curl-HU-011-a-HU-015.txt'
$tempDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("hu011-hu015-" + [guid]::NewGuid().ToString('N'))
$curlTempRelative = 'docs\.curl-e2e-temp'
$curlTempDirectory = Join-Path $repoRoot $curlTempRelative
$bodyDirectory = Join-Path $curlTempDirectory 'bodies'
$bodyDirectoryRelative = Join-Path $curlTempRelative 'bodies'
$downloadDirectory = Join-Path $curlTempDirectory 'downloads'
$downloadDirectoryRelative = Join-Path $curlTempRelative 'downloads'
$logPath = Join-Path $tempDirectory 'server.log'
$errorLogPath = Join-Path $tempDirectory 'server-error.log'
$script:Cases = [System.Collections.Generic.List[object]]::new()
$serverProcess = $null
$port = $null
$previousDbPath = $env:DB_PATH
$previousPort = $env:PORT
$locationPushed = $false

function Get-FreePort {
  foreach ($candidate in 3000..3010) {
    $listener = $null
    try {
      $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $candidate)
      $listener.Start()
      return $candidate
    } catch {
      if ($candidate -eq 3010) { throw 'No hay puertos libres entre 3000 y 3010.' }
    } finally {
      if ($listener) { $listener.Stop() }
    }
  }
}

function Write-JsonBody([object]$value, [string]$name) {
  $path = Join-Path $bodyDirectory "$name.json"
  $curlPath = Join-Path $script:BodyDirectoryRelative "$name.json"
  $json = ConvertTo-Json -InputObject $value -Depth 20 -Compress
  [System.IO.File]::WriteAllText($path, $json, [System.Text.UTF8Encoding]::new($false))
  return $curlPath
}

function Merge-Body([hashtable]$source, [hashtable]$updates) {
  $merged = @{}
  foreach ($key in $source.Keys) { $merged[$key] = $source[$key] }
  foreach ($key in $updates.Keys) { $merged[$key] = $updates[$key] }
  return $merged
}

function Get-ResponseBody([string]$raw) {
  $separator = $raw.LastIndexOf("`r`n`r`n")
  if ($separator -lt 0) { $separator = $raw.LastIndexOf("`n`n") }
  if ($separator -lt 0) { return '' }
  if ($raw.StartsWith('HTTP/')) {
    return $raw.Substring($separator).Trim()
  }
  return $raw.Substring($separator).Trim()
}

function Save-CurlResponseBody([string]$outputFile, [string]$bodyFile) {
  $bytes = [System.IO.File]::ReadAllBytes($outputFile)
  $headerPrefix = [System.Text.Encoding]::ASCII.GetBytes('HTTP/')
  $startsWithHeaders = $bytes.Length -ge $headerPrefix.Length
  for ($index = 0; $startsWithHeaders -and $index -lt $headerPrefix.Length; $index++) {
    if ($bytes[$index] -ne $headerPrefix[$index]) { $startsWithHeaders = $false }
  }

  if ($startsWithHeaders) {
    $separator = -1
    for ($index = 0; $index -le $bytes.Length - 4; $index++) {
      if ($bytes[$index] -eq 13 -and $bytes[$index + 1] -eq 10 -and $bytes[$index + 2] -eq 13 -and $bytes[$index + 3] -eq 10) {
        $separator = $index + 4
        break
      }
    }
    if ($separator -lt 0) { throw 'curl -i no produjo un separador entre headers y body.' }
    $bytes = $bytes[$separator..($bytes.Length - 1)]
  }
  [System.IO.File]::WriteAllBytes($bodyFile, $bytes)
  return $bodyFile
}

function Invoke-Case {
  param(
    [string]$Title,
    [string]$Expected,
    [string]$Method,
    [string]$Path,
    [object]$Body,
    [string]$BodyFile,
    [string]$OutputFile,
    [string]$HeaderFile,
    [scriptblock]$Checks
  )

  $uri = "$script:BaseUrl$Path"
  $arguments = @('-i', '-sS', '-X', $Method)
  $command = "curl.exe -i -sS -X $Method `"$uri`""
  if ($null -ne $Body) {
    $BodyFile = Write-JsonBody $Body ("request-" + ($script:Cases.Count + 1))
  }
  if ($BodyFile) {
    $arguments += @('-H', 'Content-Type: application/json', '--data-binary', "@$BodyFile")
    $command += " -H `"Content-Type: application/json`" --data-binary `"@$BodyFile`""
  }
  if ($OutputFile) {
    $arguments += @('-D', $HeaderFile, '-o', $OutputFile)
    $command = "curl.exe -i -sS -D `"$HeaderFile`" -o `"$OutputFile`" `"$uri`""
    $arguments = @('-i', '-sS', '-D', $HeaderFile, '-o', $OutputFile, $uri)
  } else {
    $arguments += @($uri)
  }

  $raw = ''
  $status = $null
  $passed = $false
  $reason = ''
  try {
    $raw = (& curl.exe @arguments 2>&1 | Out-String).TrimEnd()
    if ($OutputFile -and (Test-Path -LiteralPath $HeaderFile)) {
      $raw = Get-Content -LiteralPath $HeaderFile -Raw
    }
    $match = [regex]::Match($raw, 'HTTP/\S+\s+(\d{3})')
    if ($match.Success) { $status = [int]$match.Groups[1].Value }
    if ($status -ne [int]$Expected) {
      throw "Status real $status; esperado $Expected."
    }

    $bodyText = if ($OutputFile) { '' } else { Get-ResponseBody $raw }
    $json = $null
    if ($bodyText) {
      try { $json = ConvertFrom-Json -InputObject $bodyText -ErrorAction Stop } catch {}
    }
    $checkedOutput = $OutputFile
    if ($OutputFile -and (Test-Path -LiteralPath $OutputFile)) {
      $checkedOutput = Save-CurlResponseBody $OutputFile ($OutputFile + '.body')
    }
    if ($Checks) { & $Checks $json $bodyText $checkedOutput }
    $passed = $true
    $reason = 'Status y comprobaciones esperados.'
  } catch {
    $reason = $_.Exception.Message
  }

  $raw = [regex]::Replace($raw, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[correo omitido]')
  $raw = [regex]::Replace($raw, '[A-Za-z0-9+/]{256,}={0,2}', {
    param($match)
    "...[recortado, $($match.Value.Length) caracteres]"
  })
  $responseText = $raw.Trim()
  if ($OutputFile -and (Test-Path -LiteralPath $OutputFile)) {
    $bodyFile = $OutputFile + '.body'
    if (Test-Path -LiteralPath $bodyFile) {
      $responseText += "`nBody binario separado de los headers curl -i; hash SHA256: $((Get-FileHash -LiteralPath $bodyFile -Algorithm SHA256).Hash)"
    }
  }

  $script:Cases.Add([pscustomobject]@{
      Title = $Title
      Expected = $Expected
      Status = $status
      Command = $command
      Response = $responseText
      Passed = $passed
      Reason = $reason
    })
  return [pscustomobject]@{ Status = $status; Raw = $raw; Json = $json; OutputFile = $OutputFile }
}

function Require-Id([object]$response, [string]$description) {
  if ($null -eq $response.Json -or $null -eq $response.Json.id) {
    throw "No se pudo extraer el ID de $description; revisar el caso HTTP previo."
  }
  return [int]$response.Json.id
}

function New-ActivityBody([int]$teacherId, [string]$title, [string]$due, [bool]$late, [bool]$replace, [string]$state) {
  return @{
    docenteId = $teacherId
    titulo = $title
    instrucciones = 'Instrucciones ficticias para la prueba de punta a punta.'
    fechaLimite = $due
    puntajeMaximo = 5
    permiteEntregaTardia = $late
    permiteReemplazoEntrega = $replace
    estado = $state
  }
}

function Write-Report {
  $okCount = @($script:Cases | Where-Object Passed).Count
  $failedCount = $script:Cases.Count - $okCount
  $lines = [System.Collections.Generic.List[string]]::new()
  $lines.Add("# Prueba curl HU-011 a HU-015")
  $lines.Add("Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
  $lines.Add("Puerto: $port")
  $lines.Add('BD usada: test.sqlite (temporal)')
  $lines.Add('Todos los nombres y contraseñas usados son ficticios; correos de respuesta omitidos.')
  $lines.Add('Nota de verificación: una corrida preliminar comparó el archivo guardado por curl -i incluyendo sus headers; el comprobador se corrigió para separar headers del body y se repitieron todos los casos. En esta corrida el hash del body coincide con el archivo original.')
  $lines.Add('')
  for ($index = 0; $index -lt $script:Cases.Count; $index++) {
    $case = $script:Cases[$index]
    $result = if ($case.Passed) { 'OK' } else { "FALLÓ ($($case.Reason))" }
    $lines.Add("### [$($index + 1)] $($case.Title)")
    $lines.Add("Esperado: $($case.Expected)")
    $lines.Add('Comando:')
    $lines.Add($case.Command)
    $lines.Add('Respuesta:')
    $lines.Add($case.Response)
    $lines.Add("Resultado: $result")
    $lines.Add('')
  }
  $lines.Add('## Resumen')
  $lines.Add('| Total | OK | FALLÓ |')
  $lines.Add('|---:|---:|---:|')
  $lines.Add("| $($script:Cases.Count) | $okCount | $failedCount |")
  [System.IO.File]::WriteAllText($reportPath, ($lines -join "`r`n"), [System.Text.UTF8Encoding]::new($false))
}

try {
  $testDatabaseExists = (Test-Path -LiteralPath (Join-Path $repoRoot 'test.sqlite')) `
    -or (Test-Path -LiteralPath (Join-Path $repoRoot 'test.sqlite-wal')) `
    -or (Test-Path -LiteralPath (Join-Path $repoRoot 'test.sqlite-shm'))
  if ($testDatabaseExists -or (Test-Path -LiteralPath $curlTempDirectory)) {
    throw 'Ya existe test.sqlite, un archivo auxiliar o el directorio temporal curl; no se sobrescribe.'
  }

  Push-Location $repoRoot
  $locationPushed = $true
  $script:BodyDirectoryRelative = $bodyDirectoryRelative
  $script:DownloadDirectoryRelative = $downloadDirectoryRelative
  New-Item -ItemType Directory -Path $tempDirectory -Force | Out-Null
  New-Item -ItemType Directory -Path $bodyDirectory -Force | Out-Null
  New-Item -ItemType Directory -Path $downloadDirectory -Force | Out-Null
  $port = Get-FreePort
  $env:DB_PATH = './test.sqlite'
  $env:PORT = "$port"
  $serverProcess = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $repoRoot `
    -PassThru -RedirectStandardOutput $logPath -RedirectStandardError $errorLogPath
  $script:BaseUrl = "http://127.0.0.1:$port"

  $ready = $false
  for ($attempt = 0; $attempt -lt 100; $attempt++) {
    if (Test-Path -LiteralPath $logPath) {
      if ((Get-Content -LiteralPath $logPath -Raw) -match 'Servidor corriendo en') {
        $ready = $true
        break
      }
    }
    if ($serverProcess.HasExited) { throw "El servidor terminó al iniciar. $((Get-Content $errorLogPath -Raw -ErrorAction SilentlyContinue))" }
    Start-Sleep -Milliseconds 100
  }
  if (-not $ready) { throw 'El servidor no informó que estuviera listo.' }

  $registerBase = @{
    apellido = 'Prueba'
    password = 'Prueba123'
    fechaNacimiento = '1990-05-20'
    genero = 'otro'
  }
  $registerTeacher = $registerBase + @{ nombre = 'Docente'; email = 'docente-hu011@example.test'; rol = 'docente' }
  $ownerResponse = Invoke-Case -Title 'Registro docente dueño' -Expected '201' -Method POST -Path '/api/auth/register' -Body $registerTeacher
  $ownerId = Require-Id $ownerResponse 'docente dueño'
  $otherTeacher = $registerBase + @{ nombre = 'Segundo'; email = 'docente-ajeno@example.test'; rol = 'docente' }
  $otherTeacherId = Require-Id (Invoke-Case -Title 'Registro de segundo docente' -Expected '201' -Method POST -Path '/api/auth/register' -Body $otherTeacher) 'segundo docente'

  $studentOne = $registerBase + @{ nombre = 'Estudiante Uno'; email = 'estudiante-uno@example.test'; rol = 'estudiante' }
  $studentOneId = Require-Id (Invoke-Case -Title 'Registro estudiante inscrito 1' -Expected '201' -Method POST -Path '/api/auth/register' -Body $studentOne) 'estudiante 1'
  $studentTwo = $registerBase + @{ nombre = 'Estudiante Dos'; email = 'estudiante-dos@example.test'; rol = 'estudiante' }
  $studentTwoId = Require-Id (Invoke-Case -Title 'Registro estudiante inscrito 2' -Expected '201' -Method POST -Path '/api/auth/register' -Body $studentTwo) 'estudiante 2'
  $studentThree = $registerBase + @{ nombre = 'Estudiante Tres'; email = 'estudiante-tres@example.test'; rol = 'estudiante' }
  $studentThreeId = Require-Id (Invoke-Case -Title 'Registro estudiante no inscrito' -Expected '201' -Method POST -Path '/api/auth/register' -Body $studentThree) 'estudiante 3'

  Invoke-Case -Title 'Login válido' -Expected '200' -Method POST -Path '/api/auth/login' `
    -Body @{ email = 'docente-hu011@example.test'; password = 'Prueba123' } | Out-Null
  Invoke-Case -Title 'Login con contraseña errónea' -Expected '401' -Method POST -Path '/api/auth/login' `
    -Body @{ email = 'docente-hu011@example.test'; password = 'Incorrecta123' } | Out-Null

  $courseResponse = Invoke-Case -Title 'Crear curso' -Expected '201' -Method POST -Path '/api/cursos' `
    -Body @{ nombre = 'Curso de prueba HU-011 a HU-015'; descripcion = 'Curso temporal ficticio'; docenteId = $ownerId }
  $courseId = Require-Id $courseResponse 'curso'
  Invoke-Case -Title 'Inscripción del estudiante 1' -Expected '201' -Method POST -Path '/api/inscripciones' `
    -Body @{ estudianteId = $studentOneId; cursoId = $courseId } | Out-Null
  Invoke-Case -Title 'Inscripción del estudiante 2' -Expected '201' -Method POST -Path '/api/inscripciones' `
    -Body @{ estudianteId = $studentTwoId; cursoId = $courseId } | Out-Null
  Invoke-Case -Title 'Inscripción duplicada' -Expected '400' -Method POST -Path '/api/inscripciones' `
    -Body @{ estudianteId = $studentOneId; cursoId = $courseId } | Out-Null

  $dueFuture = (Get-Date).ToUniversalTime().AddHours(1).ToString('o')
  $mainActivityBody = New-ActivityBody $ownerId 'Actividad principal' $dueFuture $false $false 'publicada'
  $mainActivityResponse = Invoke-Case -Title 'HU-011 crear actividad publicada' -Expected '201' -Method POST `
    -Path "/api/cursos/$courseId/actividades" -Body $mainActivityBody
  $activityId = Require-Id $mainActivityResponse 'actividad principal'
  $script:activityId = $activityId
  Invoke-Case -Title 'HU-011 fecha límite pasada' -Expected '400' -Method POST -Path "/api/cursos/$courseId/actividades" `
    -Body (New-ActivityBody $ownerId 'Fecha pasada' (Get-Date).ToUniversalTime().AddMinutes(-1).ToString('o') $false $false 'publicada') | Out-Null
  Invoke-Case -Title 'HU-011 docente ajeno al curso' -Expected '403' -Method POST -Path "/api/cursos/$courseId/actividades" `
    -Body (New-ActivityBody $otherTeacherId 'Docente ajeno' $dueFuture $false $false 'publicada') | Out-Null

  Invoke-Case -Title 'HU-012 cronograma para estudiante inscrito' -Expected '200' -Method GET `
    -Path "/api/cursos/$courseId/actividades?usuarioId=$studentOneId" `
    -Checks { param($json) if (-not $json[0].puedeEntregar) { throw 'Se esperaba puedeEntregar=true.' } } | Out-Null
  Invoke-Case -Title 'HU-012 cronograma para estudiante no inscrito' -Expected '403' -Method GET `
    -Path "/api/cursos/$courseId/actividades?usuarioId=$studentThreeId" | Out-Null
  Invoke-Case -Title 'HU-012 cronograma para docente dueño' -Expected '200' -Method GET `
    -Path "/api/cursos/$courseId/actividades?usuarioId=$ownerId" | Out-Null

  $filePath = Join-Path $tempDirectory 'entrega.pdf'
  $script:filePath = $filePath
  [System.IO.File]::WriteAllBytes($filePath, [System.Text.Encoding]::UTF8.GetBytes("%PDF-1.4`nHU-013 prueba ficticia`n%%EOF`n"))
  $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
  $fileDataUri = 'data:application/pdf;base64,' + [Convert]::ToBase64String($fileBytes)
  $script:fileDataUri = $fileDataUri
  $uploadBody = @{ estudianteId = $studentOneId; archivo = $fileDataUri; archivoNombre = 'entrega-prueba.pdf'; comentario = 'Primera entrega de prueba' }
  $deliveryResponse = Invoke-Case -Title 'HU-013 entrega PDF válida' -Expected '201' -Method POST `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas" -Body $uploadBody
  $deliveryId = Require-Id $deliveryResponse 'entrega principal'
  Invoke-Case -Title 'HU-013 entrega desde estudiante no inscrito' -Expected '403' -Method POST `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas" `
    -Body (Merge-Body $uploadBody @{ estudianteId = $studentThreeId }) | Out-Null
  Invoke-Case -Title 'HU-013 intento de entrega por docente' -Expected '403' -Method POST `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas" `
    -Body (Merge-Body $uploadBody @{ estudianteId = $ownerId }) | Out-Null
  Invoke-Case -Title 'HU-013 tipo de archivo no permitido' -Expected '400' -Method POST `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas" `
    -Body (Merge-Body $uploadBody @{ archivo = 'data:text/csv;base64,YQ==' }) | Out-Null
  $withoutName = $uploadBody.Clone()
  $null = $withoutName.Remove('archivoNombre')
  Invoke-Case -Title 'HU-013 falta archivoNombre' -Expected '400' -Method POST `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas" -Body $withoutName | Out-Null

  $draftResponse = Invoke-Case -Title 'HU-011 crear actividad borrador' -Expected '201' -Method POST `
    -Path "/api/cursos/$courseId/actividades" `
    -Body (New-ActivityBody $ownerId 'Actividad borrador' $dueFuture $false $false 'borrador')
  $draftActivityId = Require-Id $draftResponse 'actividad borrador'
  Invoke-Case -Title 'HU-013 entrega en actividad borrador' -Expected '403' -Method POST `
    -Path "/api/cursos/$courseId/actividades/$draftActivityId/entregas" -Body $uploadBody | Out-Null
  Invoke-Case -Title 'HU-013 reemplazo inicialmente desactivado' -Expected '409' -Method POST `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas" -Body $uploadBody | Out-Null

  Invoke-Case -Title 'HU-013 activar reemplazo de entrega' -Expected '200' -Method PATCH `
    -Path "/api/cursos/$courseId/actividades/$activityId/configuracion-entrega" `
    -Body @{ docenteId = $ownerId; permiteReemplazoEntrega = $true } | Out-Null
  $replacementBody = $uploadBody.Clone()
  $replacementBody.comentario = 'Reemplazo válido'
  Invoke-Case -Title 'HU-013 reemplazo permitido' -Expected '200' -Method POST `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas" -Body $replacementBody | Out-Null
  Invoke-Case -Title 'HU-013 configurar reemplazo con docente ajeno' -Expected '403' -Method PATCH `
    -Path "/api/cursos/$courseId/actividades/$activityId/configuracion-entrega" `
    -Body @{ docenteId = $otherTeacherId; permiteReemplazoEntrega = $true } | Out-Null
  Invoke-Case -Title 'HU-013 PATCH de configuración sin campos' -Expected '400' -Method PATCH `
    -Path "/api/cursos/$courseId/actividades/$activityId/configuracion-entrega" -Body @{ docenteId = $ownerId } | Out-Null

  $lateFalseDue = (Get-Date).ToUniversalTime().AddSeconds(5).ToString('o')
  $lateFalseResponse = Invoke-Case -Title 'HU-011 crear actividad tardía no permitida' -Expected '201' -Method POST `
    -Path "/api/cursos/$courseId/actividades" `
    -Body (New-ActivityBody $ownerId 'Tardía bloqueada' $lateFalseDue $false $false 'publicada')
  $lateFalseActivityId = Require-Id $lateFalseResponse 'actividad tardía bloqueada'
  $lateTrueDue = (Get-Date).ToUniversalTime().AddSeconds(5).ToString('o')
  $lateTrueResponse = Invoke-Case -Title 'HU-011 crear actividad tardía permitida' -Expected '201' -Method POST `
    -Path "/api/cursos/$courseId/actividades" `
    -Body (New-ActivityBody $ownerId 'Tardía permitida' $lateTrueDue $true $false 'publicada')
  $lateTrueActivityId = Require-Id $lateTrueResponse 'actividad tardía permitida'
  Start-Sleep -Seconds 6
  Invoke-Case -Title 'HU-013 entrega tardía no permitida' -Expected '403' -Method POST `
    -Path "/api/cursos/$courseId/actividades/$lateFalseActivityId/entregas" -Body $uploadBody | Out-Null
  $lateDeliveryResponse = Invoke-Case -Title 'HU-013 entrega tardía permitida' -Expected '201' -Method POST `
    -Path "/api/cursos/$courseId/actividades/$lateTrueActivityId/entregas" -Body $uploadBody `
    -Checks { param($json) if (-not $json.esTardia) { throw 'Se esperaba esTardia=true.' } }
  $lateDeliveryId = Require-Id $lateDeliveryResponse 'entrega tardía'

  $otherActivityResponse = Invoke-Case -Title 'HU-011 crear actividad para prueba de pertenencia' -Expected '201' -Method POST `
    -Path "/api/cursos/$courseId/actividades" `
    -Body (New-ActivityBody $ownerId 'Otra actividad' $dueFuture $false $false 'publicada')
  $otherActivityId = Require-Id $otherActivityResponse 'otra actividad'
  $otherDeliveryResponse = Invoke-Case -Title 'HU-013 entregar archivo en otra actividad' -Expected '201' -Method POST `
    -Path "/api/cursos/$courseId/actividades/$otherActivityId/entregas" -Body $uploadBody
  $otherDeliveryId = Require-Id $otherDeliveryResponse 'entrega de otra actividad'

  $listPath = "/api/cursos/$courseId/actividades/$activityId/entregas?docenteId=$ownerId"
  Invoke-Case -Title 'HU-014 listado para docente dueño, sin base64 y resumen coherente' -Expected '200' -Method GET -Path $listPath `
    -Checks {
      param($json,$bodyText)
      if ($json.resumen.totalEstudiantes -ne 2 -or $json.resumen.entregaron -ne 1 -or $json.resumen.noEntregaron -ne 1) {
        throw 'El resumen no refleja dos inscritos, una entrega y un estudiante pendiente.'
      }
      if ($bodyText.Contains($script:fileDataUri.Split(',')[1])) { throw 'El listado filtró el base64.' }
    } | Out-Null
  Invoke-Case -Title 'HU-014 listado con docente ajeno' -Expected '403' -Method GET `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas?docenteId=$otherTeacherId" | Out-Null
  Invoke-Case -Title 'HU-014 listado con estudiante como docenteId' -Expected '403' -Method GET `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas?docenteId=$studentOneId" | Out-Null

  $downloadPath = Join-Path $downloadDirectoryRelative 'inline.pdf'
  $downloadHeaders = Join-Path $downloadDirectoryRelative 'inline-headers.txt'
  $script:downloadHeaders = $downloadHeaders
  $script:DownloadDirectoryRelative = $downloadDirectoryRelative
  $fileResponse = Invoke-Case -Title 'HU-014 abrir archivo y comparar SHA256' -Expected '200' -Method GET `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas/$deliveryId/archivo?docenteId=$ownerId" `
    -OutputFile $downloadPath -HeaderFile $downloadHeaders `
    -Checks {
      param($nullJson,$nullBody,$outputFile)
      $expectedHash = (Get-FileHash -LiteralPath $script:filePath -Algorithm SHA256).Hash
      $actualHash = (Get-FileHash -LiteralPath $outputFile -Algorithm SHA256).Hash
      if ($expectedHash -ne $actualHash) { throw "Hash SHA256 distinto: original=$expectedHash descargado=$actualHash" }
      $headers = Get-Content -LiteralPath $script:downloadHeaders -Raw
      if ($headers -notmatch '(?im)^Content-Type:\s*application/pdf') { throw 'Content-Type no es application/pdf.' }
    }
  Invoke-Case -Title 'HU-014 descargar archivo con attachment' -Expected '200' -Method GET `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas/$deliveryId/archivo?docenteId=$ownerId&descargar=true" `
    -OutputFile (Join-Path $downloadDirectoryRelative 'attachment.pdf') `
    -HeaderFile (Join-Path $downloadDirectoryRelative 'attachment-headers.txt') `
    -Checks {
      param($nullJson,$nullBody,$outputFile)
      $headers = Get-Content -LiteralPath (Join-Path $script:DownloadDirectoryRelative 'attachment-headers.txt') -Raw
      if ($headers -notmatch '(?im)^Content-Disposition:\s*attachment;') { throw 'Content-Disposition no indica attachment.' }
    } | Out-Null
  Invoke-Case -Title 'HU-014 entrega de otra actividad devuelve 404' -Expected '404' -Method GET `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas/$otherDeliveryId/archivo?docenteId=$ownerId" | Out-Null

  $gradePath = "/api/cursos/$courseId/actividades/$activityId/entregas/$deliveryId/calificacion"
  $gradeResponse = Invoke-Case -Title 'HU-015 calificar con 4.5 y retroalimentación' -Expected '200' -Method PUT `
    -Path $gradePath -Body @{ docenteId = $ownerId; nota = 4.5; retroalimentacion = 'Buen trabajo.' } `
    -Checks { param($json) if ($json.estado -ne 'calificada' -or $json.nota -ne 4.5 -or -not $json.fechaCalificacion) { throw 'Respuesta no muestra entrega calificada, nota o fecha.' } }
  Invoke-Case -Title 'HU-015 recalificar y sobrescribir valores' -Expected '200' -Method PUT -Path $gradePath `
    -Body @{ docenteId = $ownerId; nota = 4.25; retroalimentacion = 'Calificación actualizada.' } `
    -Checks { param($json) if ($json.nota -ne 4.25 -or $json.retroalimentacion -ne 'Calificación actualizada.') { throw 'No se sobrescribió la calificación.' } } | Out-Null

  foreach ($invalid in @(
      @{ Title = 'nota superior al máximo 5.5'; Body = @{ docenteId = $ownerId; nota = 5.5 } },
      @{ Title = 'nota negativa -1'; Body = @{ docenteId = $ownerId; nota = -1 } },
      @{ Title = 'nota string "4"'; Body = @{ docenteId = $ownerId; nota = '4' } },
      @{ Title = 'nota con tres decimales 4.555'; Body = @{ docenteId = $ownerId; nota = 4.555 } },
      @{ Title = 'nota omitida'; Body = @{ docenteId = $ownerId } }
    )) {
    Invoke-Case -Title "HU-015 $($invalid.Title)" -Expected '400' -Method PUT -Path $gradePath -Body $invalid.Body | Out-Null
  }
  Invoke-Case -Title 'HU-015 retroalimentación mayor a 1000 caracteres' -Expected '400' -Method PUT -Path $gradePath `
    -Body @{ docenteId = $ownerId; nota = 4; retroalimentacion = 'x' * 1001 } | Out-Null
  Invoke-Case -Title 'HU-015 calificación con docente ajeno' -Expected '403' -Method PUT -Path $gradePath `
    -Body @{ docenteId = $otherTeacherId; nota = 4 } | Out-Null
  Invoke-Case -Title 'HU-015 calificación con estudiante como docenteId' -Expected '403' -Method PUT -Path $gradePath `
    -Body @{ docenteId = $studentOneId; nota = 4 } | Out-Null
  Invoke-Case -Title 'HU-015 entrega de otra actividad devuelve 404' -Expected '404' -Method PUT `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas/$otherDeliveryId/calificacion" `
    -Body @{ docenteId = $ownerId; nota = 4 } | Out-Null

  Invoke-Case -Title 'Regresión HU-013: no reemplazar entrega calificada' -Expected '409' -Method POST `
    -Path "/api/cursos/$courseId/actividades/$activityId/entregas" -Body $replacementBody | Out-Null
  Invoke-Case -Title 'Regresión HU-014: pendientes de revisión disminuye a cero' -Expected '200' -Method GET `
    -Path $listPath -Checks {
      param($json)
      if ($json.resumen.pendientesDeRevision -ne 0) { throw 'Se esperaba pendientesDeRevision=0.' }
      if ($json.entregaron[0].estado -ne 'calificada') { throw 'El listado no indica estado calificada.' }
    } | Out-Null
  Invoke-Case -Title 'Regresión HU-012: nota visible al estudiante calificado' -Expected '200' -Method GET `
    -Path "/api/cursos/$courseId/actividades?usuarioId=$studentOneId" -Checks {
      param($json)
      $activity = $json | Where-Object id -eq $script:activityId | Select-Object -First 1
      if ($activity.nota -ne 4.25 -or $activity.estadoEntrega -ne 'calificada') {
        throw 'La nota o el estado calificado no se ve en el cronograma.'
      }
    } | Out-Null
} catch {
  Write-Error $_
} finally {
  if ($serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id
    try { $serverProcess.WaitForExit(10000) } catch {}
  }
  if ($previousDbPath) { $env:DB_PATH = $previousDbPath } else { Remove-Item Env:DB_PATH -ErrorAction SilentlyContinue }
  if ($previousPort) { $env:PORT = $previousPort } else { Remove-Item Env:PORT -ErrorAction SilentlyContinue }
  foreach ($name in @('test.sqlite', 'test.sqlite-wal', 'test.sqlite-shm')) {
    $databaseFile = Join-Path $repoRoot $name
    if (Test-Path -LiteralPath $databaseFile) { Remove-Item -LiteralPath $databaseFile }
  }
  if (Test-Path -LiteralPath $curlTempDirectory) {
    Get-ChildItem -LiteralPath $curlTempDirectory -Force | ForEach-Object {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force
    }
    Remove-Item -LiteralPath $curlTempDirectory -Force
  }
  if (Test-Path -LiteralPath $tempDirectory) {
    Get-ChildItem -LiteralPath $tempDirectory -Force | ForEach-Object {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force
    }
    Remove-Item -LiteralPath $tempDirectory -Force
  }
  if ($locationPushed) { Pop-Location }
  Write-Report
}

Write-Output "Reporte: $reportPath"
