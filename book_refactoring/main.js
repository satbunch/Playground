import { statement } from './statement.js';
import plays from './plays.json' with { type: 'json'};
import invoices from './invoices.json' with { type: 'json'};

for (const invoice of invoices) {
  console.log(statement(invoice, plays));
}
