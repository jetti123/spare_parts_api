const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const PORT = 3300;

// Kontrollime, kas fail eksisteerib
if (!fs.existsSync('LE.txt')) {
  console.error('LE.txt fail puudub. Veendu, et fail on samas kaustas mis server.js.');
  process.exit(1);
}

// Laeme LE.txt faili andmed mällu
let spareParts = [];

fs.createReadStream('LE.txt')
  .pipe(csv({
    separator: '\t',
    headers: ['serialNumber', 'name', '_3', '_4', '_5', '_6', '_7', '_8', '_9', '_10', 'price']
  }))
  .on('data', (row) => {
    // Teisenda ainult vajalikud väljad
    spareParts.push({
      serialNumber: row.serialNumber,
      name: row.name,
      price: row.price
    });
  })
  .on('end', () => {
    console.log('LE.txt fail on laaditud.');
  })
  .on('error', (error) => {
    console.error('Viga faili lugemisel:', error.message);
  });

// Juurendpoint
app.get('/', (req, res) => {
  res.send('Tere! API töötab. Proovi minna aadressile /spare-parts');
});

// API, mis tagastab kõik varuosad
app.get('/spare-parts', (req, res) => {
  if (spareParts.length === 0) {
    return res.status(500).json({ error: 'Andmed ei ole veel laetud. Proovi hiljem uuesti.' });
  }

  let result = spareParts;

  // Filtreerimine nime või seerianumbri järgi
  const name = req.query.name;
  const sn = req.query.sn;

  if (name) {
    result = result.filter((part) =>
      part.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  if (sn) {
    result = result.filter((part) =>
      part.serialNumber.includes(sn)
    );
  }

  // Sorteerimine
  const sortField = req.query.sort;
  if (sortField) {
    const desc = sortField.startsWith('-');
    const field = desc ? sortField.substring(1) : sortField;
    result = result.sort((a, b) => {
      const valA = parseFloat(a[field]) || 0;
      const valB = parseFloat(b[field]) || 0;
      return desc ? valB - valA : valA - valB;
    });
  }

  // Lehekülgede kaupa jagamine
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 30;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  result = result.slice(start, end);

  res.json(result);
});

// Serveri käivitamine
app.listen(PORT, () => {
  console.log(`Server töötab aadressil http://localhost:${PORT}`);
});
