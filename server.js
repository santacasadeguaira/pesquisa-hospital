const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Static files
const basePath = __dirname;
app.use(express.static(path.join(basePath, 'public')));

// PostgreSQL (Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 🔹 ROTA INICIAL (AGORA FUNCIONA NO NAVEGADOR)
app.get('/', (req, res) => {
  res.send('Sistema online funcionando 🚀');
});

// SALVAR RESPOSTA
app.post('/api/resposta', async (req, res) => {
  const { cargo, unidade, respostas } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO respostas (cargo, unidade, respostas) VALUES ($1,$2,$3) RETURNING id',
      [cargo, unidade, respostas]
    );

    res.json({ success: true, id: result.rows[0].id });

  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// RELATÓRIO POR CARGO
app.get('/api/relatorios/cargos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cargo, COUNT(*) as quantidade 
      FROM respostas 
      WHERE cargo IS NOT NULL 
      GROUP BY cargo 
      ORDER BY quantidade DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// RELATÓRIO POR UNIDADE
app.get('/api/relatorios/unidades', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT unidade, COUNT(*) as quantidade 
      FROM respostas 
      WHERE unidade IS NOT NULL 
      GROUP BY unidade 
      ORDER BY quantidade DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// RELATÓRIO DINÂMICO
app.get('/api/relatorios', async (req, res) => {
  const { pergunta, cargo } = req.query;

  try {
    let sql = 'SELECT cargo, respostas FROM respostas WHERE respostas IS NOT NULL';
    let params = [];

    if (cargo && cargo !== '') {
      sql += ' AND cargo = $1';
      params.push(cargo);
    }

    const result = await pool.query(sql, params);

    const filtrados = result.rows.filter(row => {
      try {
        return row.respostas[pergunta] !== undefined && row.respostas[pergunta] !== '';
      } catch {
        return false;
      }
    });

    res.json(filtrados);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DEBUG
app.get('/api/debug/respostas', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, cargo, unidade, data FROM respostas ORDER BY id DESC LIMIT 10'
    );
    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debug/total', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM respostas');
    res.json({ total: result.rows[0].count });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// START
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Servidor rodando...');
});