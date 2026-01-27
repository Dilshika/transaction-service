export interface ITransactionLog {
  transaction_id: string;
  account_no: string;
  amount: number;
  security_context: {
    ip_address: string;
    device_id: string;
    geo_location: {
      type: 'Point';
      coordinates: [number, number]; // [long, lat]
    };
  };
  timestamp: Date;
}
