import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { readFile } from 'fs/promises';

async function createAdmin() {
  try {
    const configData = await readFile('./firebase-applet-config.json', 'utf-8');
    const config = JSON.parse(configData);
    
    const app = initializeApp(config);
    const auth = getAuth(app);
    
    const email = 'admin@smk.co.id';
    const password = 'admin123456';
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('User created successfully:', userCredential.user.email);
    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error.message);
    process.exit(1);
  }
}

createAdmin();
