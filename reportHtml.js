export function generateReportHtml(vistoria){
  const itensHtml = vistoria.itens.map((it, idx)=>{
    const coords = it.location ? `${it.location.latitude.toFixed(5)}, ${it.location.longitude.toFixed(5)}` : '';
    return `
      <div style="margin-bottom:12px; page-break-inside:avoid;">
        <h3>${idx+1}. ${it.tipo}</h3>
        <p>Timestamp: ${it.timestamp}</p>
        ${it.km ? `<p>KM: ${it.km}</p>` : ''}
        <p>Coords: ${coords}</p>
        <div style="width:100%; max-width:700px; border:1px solid #ddd; padding:6px; background:#fff;">
          <img src="${it.file}" style="max-width:700px; width:100%; height:auto;" />
          <div style="font-size:12px; color:#fff; background:rgba(0,0,0,0.35); padding:6px; position:relative; margin-top:6px;">
            ${it.tipo} — ${vistoria.placa || ''} ${it.km ? 'KM:'+it.km : ''} — ${it.timestamp.split('T')[0]} ${coords}
          </div>
        </div>
      </div>
    `;
  }).join('\n');

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body{font-family: Arial, Helvetica, sans-serif; padding:16px}
          img{border:1px solid #ddd; padding:4px; background:#fff}
        </style>
      </head>
      <body>
        <h1>Laudo de Vistoria</h1>
        <p>ID: ${vistoria.id}</p>
        <p>Placa: ${vistoria.placa || ''} — Modelo: ${vistoria.modelo || ''} — Cliente: ${vistoria.cliente || ''}</p>
        <hr />
        ${itensHtml}
      </body>
    </html>
  `;
}
