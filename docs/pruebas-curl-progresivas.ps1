$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dbPath = Join-Path $repoRoot 'database.sqlite'
$reportPath = Join-Path $PSScriptRoot 'pruebas-curl-progresivas.txt'
$bodyDirectory = Join-Path $PSScriptRoot 'curl-progresivo-bodies'
$baseUrl = 'http://127.0.0.1:3000'

function Stop-BackendOnPort3000 {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Stop-BackendOnPort3000
Start-Sleep -Milliseconds 500

foreach ($path in @($dbPath, "$dbPath-wal", "$dbPath-shm")) {
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force
    }
}

if (Test-Path -LiteralPath $bodyDirectory) {
    Remove-Item -LiteralPath $bodyDirectory -Recurse -Force
}
New-Item -ItemType Directory -Path $bodyDirectory -Force | Out-Null

Write-Host ''
Write-Host 'Reiniciando base de datos y iniciando backend...'
Start-Process cmd.exe -ArgumentList '/K', "cd /d `"$repoRoot`" && node server.js"

$ready = $false
for ($attempt = 0; $attempt -lt 100; $attempt++) {
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/cursos" -TimeoutSec 2 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {}
    Start-Sleep -Milliseconds 100
}

if (-not $ready) {
    throw 'El backend no respondió en http://127.0.0.1:3000.'
}

Write-Host "Base reiniciada: $dbPath"
Write-Host "Servidor: $baseUrl"
Write-Host ''

$cases = [System.Collections.Generic.List[object]]::new()
$bodyCounter = 0

function Write-Body {
    param([object]$Body, [string]$Name)

    $script:bodyCounter++
    $path = Join-Path $bodyDirectory ("{0:D2}-{1}.json" -f $script:bodyCounter, $Name)
    $json = ConvertTo-Json -InputObject $Body -Depth 20 -Compress
    [System.IO.File]::WriteAllText($path, $json, [System.Text.UTF8Encoding]::new($false))
    return $path
}

function Invoke-CurlCase {
    param(
        [string]$Title,
        [string]$Method,
        [string]$Path,
        [object]$Body,
        [int]$ExpectedStatus
    )

    $uri = "$baseUrl$Path"
    $bodyPath = $null
    $arguments = @('-i', '-sS', '-X', $Method)
    $command = "curl.exe -i -sS -X $Method `"$uri`""

    if ($null -ne $Body) {
        $bodyPath = Write-Body -Body $Body -Name ($Title -replace '[^A-Za-z0-9]+', '-')
        $arguments += @('-H', 'Content-Type: application/json', '--data-binary', "@$bodyPath")
        $arguments += @($uri)
        $command += " -H `"Content-Type: application/json`" --data-binary `"@$bodyPath`""
    } else {
        $arguments += @($uri)
    }

    $raw = (& curl.exe @arguments 2>&1 | Out-String).TrimEnd()
    $match = [regex]::Match($raw, 'HTTP/\S+\s+(\d{3})')
    $status = if ($match.Success) { [int]$match.Groups[1].Value } else { 0 }
    $passed = $status -eq $ExpectedStatus

    $responsePreview = ($raw -replace "`r?`n", ' ')
    if ($responsePreview.Length -gt 700) {
        $responsePreview = $responsePreview.Substring(0, 700) + '...'
    }

    Write-Host ('=' * 100)
    Write-Host "PRUEBA $($cases.Count + 1): $Title"
    Write-Host "ENDPOINT: $Method $Path"
    Write-Host "COMANDO:"
    Write-Host "  $command"
    Write-Host "RESPUESTA ESPERADA: HTTP $ExpectedStatus"
    Write-Host "RESPUESTA REAL: HTTP $status"
    Write-Host "CUERPO: $responsePreview"
    Write-Host ("RESULTADO: " + $(if ($passed) { 'OK' } else { 'FALLO' }))
    Write-Host ''

    $cases.Add([pscustomobject]@{
        Title = $Title
        Method = $Method
        Path = $Path
        Command = $command
        Expected = $ExpectedStatus
        Actual = $status
        Passed = $passed
        Raw = $raw
    })

    if (-not $passed) {
        throw "Fallo: $Title devolvió HTTP $status; se esperaba HTTP $ExpectedStatus."
    }

    try {
        $separator = $raw.LastIndexOf("`r`n`r`n")
        if ($separator -lt 0) { $separator = $raw.LastIndexOf("`n`n") }
        if ($separator -ge 0) {
            $bodyText = $raw.Substring($separator).Trim()
            return ConvertFrom-Json -InputObject $bodyText -ErrorAction SilentlyContinue
        }
    } catch {}
    return $null
}

$teacher = Invoke-CurlCase `
    -Title 'Registrar docente' `
    -Method 'POST' `
    -Path '/api/auth/register' `
    -ExpectedStatus 201 `
    -Body @{
        nombre = 'Prueba'
        apellido = 'Docente'
        email = 'docente.progresivo@example.test'
        password = 'Prueba123'
        rol = 'docente'
        fechaNacimiento = '1988-05-20'
        genero = 'prefiero_no_decir'
    }

$student = Invoke-CurlCase `
    -Title 'Registrar estudiante' `
    -Method 'POST' `
    -Path '/api/auth/register' `
    -ExpectedStatus 201 `
    -Body @{
        nombre = 'Prueba'
        apellido = 'Estudiante'
        email = 'estudiante.progresivo@example.test'
        password = 'Prueba123'
        rol = 'estudiante'
        fechaNacimiento = '2002-05-20'
        genero = 'prefiero_no_decir'
    }

Invoke-CurlCase -Title 'Login del docente' -Method 'POST' -Path '/api/auth/login' -ExpectedStatus 200 -Body @{
    email = 'docente.progresivo@example.test'
    password = 'Prueba123'
} | Out-Null

$course = Invoke-CurlCase -Title 'Crear curso con organizacion' -Method 'POST' -Path '/api/cursos' -ExpectedStatus 201 -Body @{
    nombre = 'Curso Progresivo'
    descripcion = 'Curso creado por la prueba progresiva de cURL.'
    docenteId = [int]$teacher.id
    modalidad = 'virtual'
    semestre = '2026-2'
    codigo = 'CP-101'
    estado = 'borrador'
    notaMinima = 3.0
    cupoMaximo = 30
    enlaceVirtual = 'https://meet.google.com/prueba'
    cortes = @(
        @{ numero = 1; fechaInicio = '2027-08-03'; fechaFin = '2027-09-18'; porcentaje = 30 },
        @{ numero = 2; fechaInicio = '2027-09-21'; fechaFin = '2027-10-30'; porcentaje = 30 },
        @{ numero = 3; fechaInicio = '2027-11-02'; fechaFin = '2027-11-20'; porcentaje = 40 }
    )
}

$courseId = [int]$course.id

Invoke-CurlCase -Title 'Abrir curso' -Method 'PATCH' -Path "/api/cursos/$courseId/estado" -ExpectedStatus 200 -Body @{
    docenteId = [int]$teacher.id
    estado = 'abierto'
} | Out-Null
Invoke-CurlCase -Title 'Consultar curso creado' -Method 'GET' -Path "/api/cursos/$courseId" -ExpectedStatus 200 | Out-Null

$enrollment = Invoke-CurlCase -Title 'Inscribir estudiante' -Method 'POST' -Path '/api/inscripciones' -ExpectedStatus 201 -Body @{
    estudianteId = [int]$student.id
    cursoId = $courseId
} 

$enrollmentId = [int]$enrollment.id

Invoke-CurlCase -Title 'Consultar inscripciones del estudiante' -Method 'GET' -Path "/api/inscripciones/estudiante/$($student.id)" -ExpectedStatus 200 | Out-Null

Invoke-CurlCase -Title 'Crear sesion del cronograma' -Method 'POST' -Path "/api/cursos/$courseId/sesiones" -ExpectedStatus 201 -Body @{
    docenteId = [int]$teacher.id
    titulo = 'Sesion introductoria'
    descripcion = 'Primera sesion creada por la prueba.'
    fechaInicio = '2026-12-01T08:00:00-05:00'
    fechaFin = '2026-12-01T10:00:00-05:00'
    orden = 1
} | Out-Null

Invoke-CurlCase -Title 'Consultar sesiones del curso' -Method 'GET' -Path "/api/cursos/$courseId/sesiones" -ExpectedStatus 200 | Out-Null

$activity = Invoke-CurlCase -Title 'Crear actividad publicada' -Method 'POST' -Path "/api/cursos/$courseId/actividades" -ExpectedStatus 201 -Body @{
    docenteId = [int]$teacher.id
    corteId = 1
    titulo = 'Actividad progresiva'
    instrucciones = 'Entregue un archivo PDF de prueba.'
    fechaLimite = '2027-09-17T23:59:00-05:00'
    puntajeMaximo = 5
    permiteEntregaTardia = $false
    permiteReemplazoEntrega = $true
    estado = 'publicada'
}

$activityId = [int]$activity.id

Invoke-CurlCase -Title 'Consultar actividades del curso' -Method 'GET' -Path "/api/cursos/$courseId/actividades?usuarioId=$($student.id)" -ExpectedStatus 200 | Out-Null

Invoke-CurlCase -Title 'Publicar recurso con enlace' -Method 'POST' -Path '/api/recursos' -ExpectedStatus 201 -Body @{
    cursoId = $courseId
    docenteId = [int]$teacher.id
    nombre = 'Material progresivo'
    descripcion = 'Recurso creado por la prueba.'
    enlace = 'https://example.com/material.pdf'
} | Out-Null

$delivery = Invoke-CurlCase -Title 'Entregar actividad' -Method 'POST' -Path "/api/cursos/$courseId/actividades/$activityId/entregas" -ExpectedStatus 201 -Body @{
    estudianteId = [int]$student.id
    comentario = 'Entrega de prueba.'
    archivo = 'data:application/pdf;base64,JVBERi0xLjMKQ1JVTCBURVNUIEZJQ0hF'
    archivoNombre = 'entrega-prueba.pdf'
    archivoTipo = 'application/pdf'
}

$deliveryId = [int]$delivery.id

Invoke-CurlCase -Title 'Calificar entrega' -Method 'PUT' -Path "/api/cursos/$courseId/actividades/$activityId/entregas/$deliveryId/calificacion" -ExpectedStatus 200 -Body @{
    docenteId = [int]$teacher.id
    nota = 4.5
    retroalimentacion = 'Buen trabajo. Retroalimentacion creada por la prueba.'
} | Out-Null

Invoke-CurlCase -Title 'Consultar calificaciones del estudiante' -Method 'GET' -Path "/api/cursos/$courseId/calificaciones?estudianteId=$($student.id)" -ExpectedStatus 200 | Out-Null
Invoke-CurlCase -Title 'Consultar progreso del estudiante' -Method 'GET' -Path "/api/cursos/$courseId/progreso?estudianteId=$($student.id)" -ExpectedStatus 200 | Out-Null
Invoke-CurlCase -Title 'Consultar estadisticas del curso' -Method 'GET' -Path "/api/cursos/$courseId/estadisticas?docenteId=$($teacher.id)" -ExpectedStatus 200 | Out-Null

Invoke-CurlCase -Title 'Retirar inscripcion' -Method 'PATCH' -Path "/api/inscripciones/$enrollmentId/retirar" -ExpectedStatus 200 -Body @{
    estudianteId = [int]$student.id
} | Out-Null

$okCount = @($cases | Where-Object Passed).Count
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# Pruebas cURL progresivas')
$lines.Add("Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$lines.Add("Base reiniciada: $dbPath")
$lines.Add('')

for ($index = 0; $index -lt $cases.Count; $index++) {
    $case = $cases[$index]
    $lines.Add("## [$($index + 1)] $($case.Title)")
    $lines.Add("Endpoint: $($case.Method) $($case.Path)")
    $lines.Add("Comando: $($case.Command)")
    $lines.Add("Respuesta esperada: HTTP $($case.Expected)")
    $lines.Add("Respuesta real: HTTP $($case.Actual)")
    $lines.Add("Resultado: $(if ($case.Passed) { 'OK' } else { 'FALLO' })")
    $lines.Add('')
}

$lines.Add("Resumen: $okCount OK / $($cases.Count) pruebas.")
[System.IO.File]::WriteAllText($reportPath, ($lines -join "`r`n"), [System.Text.UTF8Encoding]::new($false))

Write-Host ('=' * 100)
Write-Host "RESUMEN: $okCount OK / $($cases.Count) pruebas."
Write-Host "Reporte: $reportPath"
Write-Host "Servidor conservado en http://127.0.0.1:3000"
