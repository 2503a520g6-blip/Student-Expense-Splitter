
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { randomBytes } = require('crypto');

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin === 'https://2503a520g6-blip.github.io' ||
      /^http:\/\/(localhost|127\.0\.0\.1):(3000|5500|5501|8080)$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json());

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error('ERROR: Supabase URL or Secret Key is missing in .env');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

console.log('Supabase URL loaded:', !!process.env.SUPABASE_URL);
console.log('Secret key loaded:', !!process.env.SUPABASE_SECRET_KEY);

// Home route
app.get('/', (req, res) => {
  res.send('SplitMate API is running!');
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('id')
      .limit(1);

    if (error) {
      console.error('SUPABASE ERROR:', error);
      return res.status(500).json({
        connected: false,
        error: error.message || 'Supabase request failed',
        code: error.code || null
      });
    }

    res.json({
      connected: true,
      message: 'Supabase connected successfully!'
    });

  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({
      connected: false,
      error: error.message || String(error)
    });
  }
});

// Create a group
app.post('/api/groups', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();

    if (!name) {
      return res.status(400).json({ error: 'Group name required' });
    }

    const join_code = randomBytes(4).toString('hex').toUpperCase();

    const { data, error } = await supabase
      .from('groups')
      .insert({ name, join_code })
      .select()
      .single();

    if (error) throw error;

    res.json(data);

  } catch (error) {
    console.error('CREATE GROUP ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join and load a group
app.get('/api/groups/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();

    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('join_code', code)
      .single();

    if (error || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('group_id', group.id);

    if (memberError) throw memberError;

    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('*, expense_splits(*)')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false });

    if (expenseError) throw expenseError;

    res.json({ group, members, expenses });

  } catch (error) {
    console.error('LOAD GROUP ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a member
app.post('/api/groups/:code/members', async (req, res) => {
  try {
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('join_code', req.params.code.toUpperCase())
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const name = String(req.body.name || '').trim();

    if (!name || name.length > 30) {
      return res.status(400).json({ error: 'Enter a valid member name' });
    }

    const { data, error } = await supabase
      .from('members')
      .insert({ group_id: group.id, name })
      .select()
      .single();

    if (error) throw error;

    res.json(data);

  } catch (error) {
    console.error('ADD MEMBER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add an expense and its shares
app.post('/api/groups/:code/expenses', async (req, res) => {
  try {
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('join_code', req.params.code.toUpperCase())
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const { title, amount, category, date, paidBy, splits } = req.body;

    if (
      !title ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      !paidBy ||
      !Array.isArray(splits) ||
      splits.length === 0
    ) {
      return res.status(400).json({ error: 'Invalid expense details' });
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        group_id: group.id,
        description: title,
        amount: Number(amount),
        category: category || 'Other',
        expense_date: date,
        paid_by_member_id: paidBy
      })
      .select()
      .single();

    if (error) throw error;

    const rows = splits.map(split => ({
      group_id: group.id,
      expense_id: expense.id,
      member_id: split.member_id,
      share_amount: Number(split.share_amount)
    }));

    const { error: splitError } = await supabase
      .from('expense_splits')
      .insert(rows);

    if (splitError) {
      await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id);

      throw splitError;
    }

    res.json({ expense, splits: rows });

  } catch (error) {
    console.error('ADD EXPENSE ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`SplitMate API running on port ${PORT}`);
});
