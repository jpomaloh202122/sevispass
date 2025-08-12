import { generateUID, validateUID } from './uid-generator';

export function testUIDGeneration() {
  console.log('Testing UID Generation...\n');
  
  const results = [];
  const uids = new Set<string>();
  
  for (let i = 0; i < 5; i++) {
    const { uid, timestamp } = generateUID();
    uids.add(uid);
    
    const isValid = validateUID(uid);
    const result = {
      iteration: i + 1,
      uid,
      timestamp: timestamp.toISOString(),
      isValid,
      isUnique: uids.size === i + 1
    };
    
    results.push(result);
    console.log(`Test ${i + 1}:`);
    console.log(`  UID: ${uid}`);
    console.log(`  Valid: ${isValid}`);
    console.log(`  Timestamp: ${timestamp.toISOString()}`);
    console.log(`  Unique: ${result.isUnique}\n`);
  }
  
  const allValid = results.every(r => r.isValid);
  const allUnique = results.every(r => r.isUnique);
  
  console.log(`Summary:`);
  console.log(`  All UIDs valid: ${allValid}`);
  console.log(`  All UIDs unique: ${allUnique}`);
  console.log(`  Total generated: ${results.length}`);
  
  return {
    results,
    allValid,
    allUnique,
    totalGenerated: results.length
  };
}

if (require.main === module) {
  testUIDGeneration();
}