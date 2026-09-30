<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Resumen del día - {{ $fecha }}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <style>
        :root {
            --bg: #f6f7fb;
            --paper: #fff;
            --text: #111827;
            --muted: #6b7280;
            --border: #e5e7eb;
            --shadow: 0 12px 28px rgba(17, 24, 39, 0.10);
            --brand: #1d6bff;
        }

        body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: var(--text);
            background: var(--bg);
        }

        .toolbar {
            position: sticky;
            top: 0;
            z-index: 10;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid var(--border);
        }

        .toolbar-inner {
            max-width: 1024px;
            margin: 0 auto;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .toolbar-title {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .toolbar-title strong {
            font-size: 14px;
        }

        .toolbar-title span {
            font-size: 12px;
            color: var(--muted);
        }

        .toolbar-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }

        @media (max-width: 720px) {
            .toolbar-inner { flex-direction: column; align-items: stretch; }
            .toolbar-actions { justify-content: space-between; }
            .hint { width: 100%; }
        }

        .btn {
            appearance: none;
            border: 1px solid var(--border);
            background: var(--paper);
            color: var(--text);
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
        }

        .btn:hover {
            background: #f9fafb;
        }

        .btn-primary {
            background: var(--brand);
            border-color: var(--brand);
            color: #fff;
            box-shadow: 0 10px 20px rgba(29, 107, 255, 0.28);
        }

        .btn-primary:hover {
            filter: brightness(0.96);
        }

        .hint {
            font-size: 12px;
            color: var(--muted);
        }

        .page {
            max-width: 1024px;
            margin: 18px auto;
            padding: 0 16px 24px;
        }

        .paper {
            background: var(--paper);
            border: 1px solid var(--border);
            border-radius: 14px;
            box-shadow: var(--shadow);
            padding: 18px;
        }

        .header {
            display:flex;
            justify-content:space-between;
            align-items:flex-end;
            gap: 12px;
            margin-bottom:16px;
        }

        .title { font-size: 20px; font-weight: 800; }
        .meta { font-size: 12px; color: var(--muted); }

        .grid { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin: 12px 0 18px; }
        .card { border:1px solid var(--border); padding:12px; border-radius:12px; }
        .card .label { font-size: 11px; color: var(--muted); font-weight: 700; }
        .card .value { font-size: 16px; font-weight: 800; margin-top:6px; }

        h3 { font-size: 14px; margin: 18px 0 8px; }

        table { width:100%; border-collapse: collapse; margin-top:8px; }
        th, td { border:1px solid var(--border); padding:8px; font-size:12px; }
        th { background:#f9fafb; text-align:left; }
        td.num { text-align:right; }
        td.center { text-align:center; }

        @media print {
            .no-print { display:none !important; }
            body { background: #fff; }
            .page { margin: 0; padding: 0; }
            .paper { border: 0; border-radius: 0; box-shadow: none; padding: 0; }
        }
    </style>
</head>
<body>

<div class="toolbar no-print">
    <div class="toolbar-inner">
        <div class="toolbar-title">
            <strong>Resumen del día</strong>
            <span>Fecha: {{ $fecha }}</span>
        </div>

        <div class="toolbar-actions">
            <span class="hint">Tip: activá “Imprimir en PDF” para guardar.</span>
            <button class="btn" onclick="window.close()">Cerrar</button>
            <button class="btn btn-primary" onclick="window.print()">
                Imprimir
            </button>
        </div>
    </div>
</div>

<div class="page">
    <div class="paper">
        <div class="header">
            <div>
                <div class="title">Resumen del día</div>
                <div class="meta">Fecha: <strong>{{ $fecha }}</strong></div>
            </div>
        </div>

        <div class="grid">
    <div class="card">
        <div class="label">Ingresos</div>
        <div class="value">$ {{ number_format($kpis['ingresos'], 2, ',', '.') }}</div>
        @if(($kpisUsd['ingresos'] ?? 0) != 0)
            <div class="value">US$ {{ number_format($kpisUsd['ingresos'], 2, ',', '.') }}</div>
        @endif
    </div>
    <div class="card">
        <div class="label">Egresos</div>
        <div class="value">$ {{ number_format($kpis['egresos'], 2, ',', '.') }}</div>
        @if(($kpisUsd['egresos'] ?? 0) != 0)
            <div class="value">US$ {{ number_format($kpisUsd['egresos'], 2, ',', '.') }}</div>
        @endif
    </div>
    <div class="card">
        <div class="label">Neto</div>
        <div class="value">$ {{ number_format($kpis['neto'], 2, ',', '.') }}</div>
        @if(($kpisUsd['neto'] ?? 0) != 0)
            <div class="value">US$ {{ number_format($kpisUsd['neto'], 2, ',', '.') }}</div>
        @endif
    </div>
</div>

<h3 style="margin:0;">Ingresos por medio de pago</h3>
<table>
    <thead>
    <tr>
        <th>Medio</th>
        <th class="center">Cantidad</th>
        <th class="num">Total</th>
        <th class="num">%</th>
    </tr>
    </thead>
    <tbody>
    @foreach($ingresosPorMedio as $row)
        <tr>
            <td>{{ $row->medio }}</td>
            <td class="center">{{ $row->cantidad }}</td>
            <td class="num">
                @if($row->total_usd !== null)
                    US$ {{ number_format($row->total_usd, 2, ',', '.') }}
                @else
                    $ {{ number_format($row->total, 2, ',', '.') }}
                @endif
            </td>
            <td class="num">{{ $row->porcentaje !== null ? number_format($row->porcentaje, 2, ',', '.') . '%' : '—' }}</td>
        </tr>
    @endforeach
    </tbody>
</table>

<h3 style="margin-top:18px; margin-bottom:0;">Egresos por medio de pago</h3>
<table>
    <thead>
    <tr>
        <th>Medio</th>
        <th class="center">Cantidad</th>
        <th class="num">Total</th>
        <th class="num">%</th>
    </tr>
    </thead>
    <tbody>
    @foreach($egresosPorMedio as $row)
        <tr>
            <td>{{ $row->medio }}</td>
            <td class="center">{{ $row->cantidad }}</td>
            <td class="num">
                @if($row->total_usd !== null)
                    US$ {{ number_format($row->total_usd, 2, ',', '.') }}
                @else
                    $ {{ number_format($row->total, 2, ',', '.') }}
                @endif
            </td>
            <td class="num">{{ $row->porcentaje !== null ? number_format($row->porcentaje, 2, ',', '.') . '%' : '—' }}</td>
        </tr>
    @endforeach
    </tbody>
</table>

    </div>
</div>

</body>
</html>
