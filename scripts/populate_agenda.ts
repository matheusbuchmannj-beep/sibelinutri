
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { format, addDays, isMonday, isTuesday, isWednesday, isThursday, isFriday, isSaturday, isSunday, parse, isBefore } from 'date-fns';
import firebaseConfig from '../firebase-applet-config.json';
import fs from 'fs';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

async function populate() {
  const startDate = new Date(2026, 3, 27); // April 27, 2026
  const endDate = new Date(2026, 4, 31);   // May 31, 2026
  const localId = 'online';

  let current = startDate;
  const batch = writeBatch(db);
  let count = 0;

  console.log(`Iniciando população de agenda de ${format(startDate, 'dd/MM/yyyy')} até ${format(endDate, 'dd/MM/yyyy')}...`);

  while (isBefore(current, addDays(endDate, 1))) {
    const dateStr = format(current, 'yyyy-MM-dd');
    let slots: string[] = [];

    if (isSunday(current)) {
      // No slots
    } else if (isSaturday(current)) {
      // 9h às 15h
      slots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
    } else {
      // Segunda a Sexta: 9h às 20h (exceto 12h-13h)
      // Slots: 09, 10, 11, [pula 12], 13, 14, 15, 16, 17, 18, 19
      slots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
    }

    if (slots.length > 0) {
      const hId = `${dateStr}_${localId}`;
      const hRef = doc(db, 'horarios', hId);
      batch.set(hRef, {
        date: dateStr,
        localId: localId,
        slots: slots
      });
      count++;
    }

    current = addDays(current, 1);
    
    // Commit in chunks if needed (Firestore limit is 500)
    if (count % 400 === 0 && count > 0) {
        // This is a simplified script, we'd need multiple batches for very long periods
    }
  }

  await batch.commit();
  console.log(`Sucesso! ${count} dias de agenda criados para o local '${localId}'.`);
  process.exit(0);
}

populate().catch(err => {
  console.error('Erro ao popular agenda:', err);
  process.exit(1);
});
