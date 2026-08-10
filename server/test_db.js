require('dotenv').config();
const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  try { 
    await prisma.$connect(); 
    console.log('Connected successfully!'); 
  } catch (e) { 
    console.error('Connection failed:', e); 
  } finally { 
    await prisma.$disconnect(); 
  } 
} 
main();
