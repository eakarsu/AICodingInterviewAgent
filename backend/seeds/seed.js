const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function seed() {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(`INSERT INTO users (email, password, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`, ['admin@example.com', hash, 'Admin']);

  const candidates = [
    { name: 'Alice Chen', email: 'alice@example.com', level: 'senior', skills: 'JavaScript, React, Node.js, System Design', interviews: 3, score: 8.5 },
    { name: 'Bob Kumar', email: 'bob@example.com', level: 'mid', skills: 'Python, Django, PostgreSQL, AWS', interviews: 2, score: 7.2 },
    { name: 'Carol Smith', email: 'carol@example.com', level: 'junior', skills: 'Java, Spring Boot, MySQL', interviews: 1, score: 6.0 },
    { name: 'David Park', email: 'david@example.com', level: 'senior', skills: 'Go, Kubernetes, Microservices, gRPC', interviews: 4, score: 9.1 },
    { name: 'Elena Rodriguez', email: 'elena@example.com', level: 'mid', skills: 'TypeScript, Angular, MongoDB, Docker', interviews: 2, score: 7.8 },
    { name: 'Frank Johnson', email: 'frank@example.com', level: 'junior', skills: 'C++, Algorithms, Data Structures', interviews: 1, score: 5.5 },
    { name: 'Grace Liu', email: 'grace@example.com', level: 'senior', skills: 'Python, ML, TensorFlow, PyTorch', interviews: 3, score: 8.9 },
    { name: 'Henry Williams', email: 'henry@example.com', level: 'mid', skills: 'Ruby, Rails, Redis, ElasticSearch', interviews: 2, score: 7.0 },
    { name: 'Iris Tanaka', email: 'iris@example.com', level: 'junior', skills: 'JavaScript, Vue.js, Firebase', interviews: 1, score: 6.5 },
    { name: 'Jack Brown', email: 'jack@example.com', level: 'senior', skills: 'Rust, Systems Programming, WebAssembly', interviews: 5, score: 9.3 },
    { name: 'Kate Wilson', email: 'kate@example.com', level: 'mid', skills: 'Swift, iOS, CoreData, ARKit', interviews: 2, score: 7.5 },
    { name: 'Leo Martinez', email: 'leo@example.com', level: 'junior', skills: 'Python, Flask, SQLAlchemy', interviews: 0, score: 0 },
    { name: 'Maya Singh', email: 'maya@example.com', level: 'senior', skills: 'Java, Scala, Apache Spark, Kafka', interviews: 3, score: 8.7 },
    { name: 'Nick Anderson', email: 'nick@example.com', level: 'mid', skills: 'PHP, Laravel, MySQL, Vue.js', interviews: 1, score: 6.8 },
    { name: 'Olivia Davis', email: 'olivia@example.com', level: 'junior', skills: 'HTML, CSS, JavaScript, React', interviews: 0, score: 0 },
    { name: 'Peter Zhang', email: 'peter@example.com', level: 'senior', skills: 'C#, .NET, Azure, Blazor', interviews: 4, score: 8.2 },
  ];

  const questions = [
    { title: 'Two Sum', diff: 'easy', cat: 'arrays', desc: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.', input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', hint: 'Use a hash map', time: 15 },
    { title: 'Reverse Linked List', diff: 'easy', cat: 'linked_list', desc: 'Reverse a singly linked list.', input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]', hint: 'Use three pointers', time: 15 },
    { title: 'Binary Tree Level Order', diff: 'medium', cat: 'trees', desc: 'Given the root of a binary tree, return the level order traversal of its nodes values.', input: 'root = [3,9,20,null,null,15,7]', output: '[[3],[9,20],[15,7]]', hint: 'Use BFS with queue', time: 25 },
    { title: 'Longest Substring Without Repeating', diff: 'medium', cat: 'strings', desc: 'Find the length of the longest substring without repeating characters.', input: 's = "abcabcbb"', output: '3', hint: 'Sliding window technique', time: 20 },
    { title: 'Merge K Sorted Lists', diff: 'hard', cat: 'linked_list', desc: 'Merge k sorted linked lists and return it as one sorted list.', input: 'lists = [[1,4,5],[1,3,4],[2,6]]', output: '[1,1,2,3,4,4,5,6]', hint: 'Min heap / priority queue', time: 40 },
    { title: 'LRU Cache', diff: 'medium', cat: 'design', desc: 'Design a data structure for Least Recently Used (LRU) cache.', input: 'capacity = 2', output: 'LRUCache object', hint: 'HashMap + Doubly Linked List', time: 35 },
    { title: 'Valid Parentheses', diff: 'easy', cat: 'stacks', desc: 'Determine if the input string has valid parentheses.', input: 's = "()[]{}"', output: 'true', hint: 'Use a stack', time: 10 },
    { title: 'Word Search II', diff: 'hard', cat: 'graphs', desc: 'Given a 2D board and a list of words, find all words on the board.', input: 'board, words = ["oath","pea","eat","rain"]', output: '["eat","oath"]', hint: 'Trie + DFS backtracking', time: 45 },
    { title: 'System Design: URL Shortener', diff: 'medium', cat: 'system_design', desc: 'Design a URL shortening service like bit.ly', input: 'N/A', output: 'Architecture document', hint: 'Hash function, base62 encoding, DB schema', time: 45 },
    { title: 'Maximum Subarray', diff: 'easy', cat: 'dynamic_programming', desc: 'Find the contiguous subarray with the largest sum.', input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', hint: 'Kadane\'s algorithm', time: 15 },
    { title: 'Median of Two Sorted Arrays', diff: 'hard', cat: 'binary_search', desc: 'Find the median of two sorted arrays.', input: 'nums1=[1,3], nums2=[2]', output: '2.0', hint: 'Binary search on shorter array', time: 40 },
    { title: 'Course Schedule', diff: 'medium', cat: 'graphs', desc: 'Determine if you can finish all courses given prerequisites.', input: 'numCourses=2, prerequisites=[[1,0]]', output: 'true', hint: 'Topological sort / cycle detection', time: 25 },
    { title: 'Implement Trie', diff: 'medium', cat: 'design', desc: 'Implement a trie with insert, search, and startsWith.', input: 'N/A', output: 'Trie object', hint: 'TrieNode with children map', time: 30 },
    { title: 'Trapping Rain Water', diff: 'hard', cat: 'arrays', desc: 'Compute how much water can be trapped after raining.', input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output: '6', hint: 'Two pointer approach', time: 35 },
    { title: 'System Design: Chat System', diff: 'hard', cat: 'system_design', desc: 'Design a real-time chat application like Slack', input: 'N/A', output: 'Architecture document', hint: 'WebSockets, message queues, sharding', time: 60 },
  ];

  for (const c of candidates) {
    const r = await pool.query('INSERT INTO candidates (name,email,experience_level,skills,interviews_taken,avg_score) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [c.name, c.email, c.level, c.skills, c.interviews, c.score]);
    const cid = r.rows[0].id;
    if (c.interviews > 0) {
      const ir = await pool.query('INSERT INTO interviews (candidate_id,status,difficulty,score,duration_min,questions_asked,started_at,completed_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()-interval \'3 days\',NOW()-interval \'3 days\'+interval \'45 minutes\') RETURNING id',
        [cid, 'completed', c.level === 'senior' ? 'hard' : c.level === 'mid' ? 'medium' : 'easy', c.score, 45 + Math.floor(Math.random()*30), 3]);
    }
  }

  for (const q of questions) {
    await pool.query('INSERT INTO questions (title,difficulty,category,description,example_input,example_output,solution_hint,time_limit_min) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [q.title, q.diff, q.cat, q.desc, q.input, q.output, q.hint, q.time]);
  }

  console.log('✅ Seed complete'); process.exit(0);
}
seed().catch(e => { console.error(e); process.exit(1); });
