const puppeteer = require("puppeteer");
const express = require("express");
const app = express();
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function videourl(a) {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1040,
      height: 900,
      deviceScaleFactor: 1,
    },
    args: ["--window-size=1040,900"]
  });
  const page = await browser.newPage();
  await page.goto("https://www.cinecalidad.vg/pelicula/" + a);

  // Espera a que el enlace 'goodstream' esté presente antes de hacer clic
  await page.waitForSelector('a');
  await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'goodstream');
    if (link) link.click();
  });

  // Espera a que los iframes se carguen
  await page.waitForSelector('iframe');
  const iframeSrcs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('iframe')).map(iframe => iframe.src);
  });

  console.log('Los src de los iframes son:', iframeSrcs);
  let url;
  if (iframeSrcs.length > 1) {
    url = iframeSrcs[1]; // Si hay más de un iframe, usar el segundo
  } else {
    url = iframeSrcs[0]; // Si solo hay uno, usar el primero
  }

  await sleep(2000);
  await page.goto("https://unlimplay.com/");
  await page.type("input#id", url);
  await page.click("button#submit");
  await sleep(2000);

  // Espera a que el iframe con el video se cargue
  await page.waitForSelector('#embedIframe');
  const videoSrcs = await page.evaluate(() => {
    var iframe = document.getElementById('embedIframe');
    return iframe ? iframe.src : null;
  });

  console.log('El src del video es:', videoSrcs);

  await browser.close();

  const datos = {
    embed: url,
    video: videoSrcs,
  };
  
  return datos;
}
app.use(express.json());

app.get("/", async (req, res) => {
    // Obtiene los parámetros de la URL desde la petición (req.query)
    const titulo = req.query.titulo;

    if (!titulo) {
        return res.status(400).send('El parámetro "titulo" es requerido');
    }

    try {
        // Llama a la función videourl de manera asincrónica
        const videoData = await videourl(titulo);
        res.json(videoData); // Enviar el objeto de datos como respuesta en formato JSON
    } catch (error) {
        console.error('Error al obtener el URL del video:', error);
        res.status(500).send('Hubo un problema al obtener el URL del video');
    }
});

// Establece el puerto en el que el servidor escuchará
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});