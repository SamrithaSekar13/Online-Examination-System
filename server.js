const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Setup MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // <-- Put your MySQL password here
  database: 'online_exam'
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL connected');
});

// Register User
app.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  const sql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
  db.query(sql, [username, password, role || 'user'], (err, result) => {
    if (err) return res.status(500).send('User registration failed');
    res.send('User registered successfully');
  });
});

// Login User
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(sql, [username, password], (err, results) => {
    if (err) return res.status(500).send('Login error');
    if (results.length === 0) return res.status(401).send('Invalid credentials');
    res.json({ id: results[0].id, username: results[0].username, role: results[0].role });
  });
});

// Admin: Add question
app.post('/questions', (req, res) => {
  const { question_text, option_a, option_b, option_c, option_d, correct_option } = req.body;
  const sql = 'INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [question_text, option_a, option_b, option_c, option_d, correct_option], (err, result) => {
    if (err) return res.status(500).send('Failed to add question');
    res.send('Question added');
  });
});

// Get all questions (for exam)
app.get('/questions', (req, res) => {
  db.query('SELECT id, question_text, option_a, option_b, option_c, option_d FROM questions', (err, results) => {
    if (err) return res.status(500).send('Error fetching questions');
    res.json(results);
  });
});

// Submit exam answers and calculate score
app.post('/submit', (req, res) => {
  const { user_id, answers } = req.body; // answers = [{question_id: 1, answer: 'a'}, ...]

  const questionIds = answers.map(a => a.question_id);
  db.query('SELECT id, correct_option FROM questions WHERE id IN (?)', [questionIds], (err, results) => {
    if (err) return res.status(500).send('Error during evaluation');

    let score = 0;
    for (const q of results) {
      const userAnswer = answers.find(a => a.question_id === q.id)?.answer;
      if (userAnswer === q.correct_option) score++;
    }

    // Save result
    db.query('INSERT INTO results (user_id, score) VALUES (?, ?)', [user_id, score], (err2) => {
      if (err2) return res.status(500).send('Error saving result');
      res.json({ score, total: results.length });
    });
  });
});

// Get user's exam results
app.get('/results/:user_id', (req, res) => {
  const userId = req.params.user_id;
  db.query('SELECT * FROM results WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).send('Error fetching results');
    res.json(results);
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
