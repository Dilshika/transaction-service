// MongoDB initialization script
db = db.getSiblingDB('transaction_db');

// Create collections
db.createCollection('transactions');
db.createCollection('accounts');
db.createCollection('idempotency');

// Create indexes for transactions
db.transactions.createIndex({ transactionId: 1 }, { unique: true });
db.transactions.createIndex({ type: 1 });
db.transactions.createIndex({ status: 1 });
db.transactions.createIndex({ fromAccount: 1, createdAt: -1 });
db.transactions.createIndex({ toAccount: 1, createdAt: -1 });
db.transactions.createIndex({ userId: 1, createdAt: -1 });
db.transactions.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
db.transactions.createIndex({ referenceNo: 1 });

// Create indexes for accounts
db.accounts.createIndex({ accountNo: 1 }, { unique: true });
db.accounts.createIndex({ userId: 1 });
db.accounts.createIndex({ status: 1 });
db.accounts.createIndex({ userId: 1, status: 1 });

// Create indexes for idempotency
db.idempotency.createIndex({ key: 1 }, { unique: true });
db.idempotency.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Insert sample accounts for testing
db.accounts.insertMany([
  {
    accountNo: 'ACC-1001',
    userId: 'user-001',
    balance: 5000.00,
    currency: 'USD',
    status: 'ACTIVE',
    accountType: 'SAVINGS',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    accountNo: 'ACC-2002',
    userId: 'user-002',
    balance: 3000.00,
    currency: 'USD',
    status: 'ACTIVE',
    accountType: 'CHECKING',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    accountNo: 'ACC-3003',
    userId: 'user-001',
    balance: 10000.00,
    currency: 'USD',
    status: 'ACTIVE',
    accountType: 'SAVINGS',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('✅ Transaction database initialized successfully!');
print('📊 Sample accounts created:');
print('   - ACC-1001 (user-001): $5,000.00');
print('   - ACC-2002 (user-002): $3,000.00');
print('   - ACC-3003 (user-001): $10,000.00');