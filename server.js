const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Conectar o crear la base de datos SQLite
const dbFile = path.join(__dirname, 'rifasvip.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
    } else {
        console.log('📦 Conectado a la base de datos SQLite (rifasvip.db)');
    }
});

// Crear tablas si no existen
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS raffles (
        id TEXT PRIMARY KEY,
        title TEXT,
        price REAL,
        drawTime TEXT,
        image TEXT,
        description TEXT,
        soldCount INTEGER,
        totalTickets INTEGER,
        status TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        raffleTitle TEXT,
        buyerName TEXT,
        buyerPhone TEXT,
        buyerEmail TEXT,
        numbers TEXT,
        ref TEXT,
        method TEXT,
        amountStr TEXT,
        date TEXT
    )`);

    // Insertar rifas por defecto si la tabla está vacía
    db.get(`SELECT COUNT(*) as count FROM raffles`, (err, row) => {
        if (row.count === 0) {
            const defaultRaffles = [
                {
                    id: 'raf-1',
                    title: 'iPhone 15 Pro Max 256GB - Titanio Natural',
                    price: 5.00,
                    drawTime: 'Viernes 30 de Octubre - 09:00 PM',
                    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
                    description: 'Equipo totalmente nuevo sellado con garantía oficial.',
                    soldCount: 342,
                    totalTickets: 1000,
                    status: 'active'
                },
                {
                    id: 'raf-2',
                    title: 'PlayStation 5 Slim Digital + 2 Controles',
                    price: 3.50,
                    drawTime: 'Sábado 31 de Octubre - 08:00 PM',
                    image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80',
                    description: 'Consola de última generación para disfrutar de tus juegos.',
                    soldCount: 1000,
                    totalTickets: 1000,
                    status: 'soldout'
                }
            ];

            const stmt = db.prepare(`INSERT INTO raffles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            defaultRaffles.forEach(r => {
                stmt.run(r.id, r.title, r.price, r.drawTime, r.image, r.description, r.soldCount, r.totalTickets, r.status);
            });
            stmt.finalize();
            console.log('✨ Rifas iniciales cargadas en la base de datos.');
        }
    });
});

// API Endpoints para Rifas
app.get('/api/raffles', (req, res) => {
    db.all(`SELECT * FROM raffles`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/raffles', (req, res) => {
    const r = req.body;
    const stmt = db.prepare(`INSERT INTO raffles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(r.id, r.title, r.price, r.drawTime, r.image, r.description, r.soldCount, r.totalTickets, r.status, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: r.id });
    });
    stmt.finalize();
});

app.put('/api/raffles/:id', (req, res) => {
    const { status } = req.body;
    db.run(`UPDATE raffles SET status = ? WHERE id = ?`, [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/raffles/:id', (req, res) => {
    db.run(`DELETE FROM raffles WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// API Endpoints para Tickets
app.get('/api/tickets', (req, res) => {
    db.all(`SELECT * FROM tickets`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const parsedRows = rows.map(r => ({ ...r, numbers: JSON.parse(r.numbers) }));
        res.json(parsedRows);
    });
});

app.post('/api/tickets', (req, res) => {
    const t = req.body;
    const stmt = db.prepare(`INSERT INTO tickets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(t.id, t.raffleTitle, t.buyerName, t.buyerPhone, t.buyerEmail, JSON.stringify(t.numbers), t.ref, t.method, t.amountStr, t.date, function(err) {
        if (err) return res.status(500).json({ error: err.message });

        db.run(`UPDATE raffles SET soldCount = soldCount + ? WHERE title = ?`, [t.numbers.length, t.raffleTitle], (updateErr) => {
            if (updateErr) console.error('Error al actualizar contador:', updateErr);
        });

        res.json({ success: true, ticketId: t.id });
    });
    stmt.finalize();
});

app.delete('/api/tickets/:id', (req, res) => {
    db.run(`DELETE FROM tickets WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor RIFAS VIP con SQLite corriendo en http://localhost:${PORT}`);
});