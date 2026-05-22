#!/bin/bash
cd "$(dirname "$0")"
echo "💻 Starting AI Coding Interview Agent..."
for port in 3020 3021; do pid=$(lsof -ti:$port 2>/dev/null); [ -n "$pid" ] && kill -9 $pid 2>/dev/null; done
createdb ai_coding_interview_db 2>/dev/null || true
cd backend && npm install 2>/dev/null; cd ../frontend && npm install 2>/dev/null; cd ..
psql -d ai_coding_interview_db -f backend/models/schema.sql 2>/dev/null
node backend/seeds/seed.js
(cd backend && npx nodemon server.js) &
(cd frontend && PORT=3021 BROWSER=none npm start) &
echo "✅ Backend: http://localhost:3020 | Frontend: http://localhost:3021"
wait
