const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = 4000;

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'todo_app',
  password: 'admin', // replace with your password
  port: 5432,
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/css'))); // Serve CSS from frontend
app.use(
  session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
  })
);

// Templating engine
app.set('views', path.join(__dirname, '../frontend/views')); // Set views path
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  pool.query('SELECT task FROM tasks WHERE user_id = $1', [req.session.userId], (err, result) => {
    if (err) throw err;
    res.render('index', { tasks: result.rows.map(row => row.task) });
  });
});

app.post('/add-task', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const task = req.body.task;
  if (task) {
    pool.query('INSERT INTO tasks (user_id, task) VALUES ($1, $2)', [req.session.userId, task], (err) => {
      if (err) throw err;
      res.redirect('/');
    });
  }
});

app.post('/delete-task', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const task = req.body.task;
  pool.query('DELETE FROM tasks WHERE user_id = $1 AND task = $2', [req.session.userId, task], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  pool.query('SELECT * FROM users WHERE username = $1', [username], (err, result) => {
    if (err) throw err;

    const user = result.rows[0];
    if (user && bcrypt.compareSync(password, user.password)) {
      req.session.userId = user.id;
      res.redirect('/');
    } else {
      res.send('Invalid username or password');
    }
  });
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = bcrypt.hashSync(password, 10);
  pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword], (err) => {
    if (err) {
      if (err.code === '23505') {
        res.send('Username already exists');
      } else {
        throw err;
      }
    } else {
      res.redirect('/login');
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Start the server
app.listen(port, () => {
  console.log(`To-Do app running at http://localhost:${5432}`);
});
