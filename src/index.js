const express = require('express');
const { v4: uuidv4 } = require("uuid");
const fs = require('fs');

const app = express();

app.use(express.json());

let customers = [];

fs.readFile("customers.json", "utf-8", (err, data) => {
  if(err) {
    console.log(err);
  } else {
    customers = JSON.parse(data);
  }
})

// Middleware
function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if(!customer) {
    return response.status(400).json({error: "Customer not found!"});
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if(operation.type === 'credit') {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
}

function updateCustomerFile() {
  fs.writeFile("customers.json", JSON.stringify(customers), (err) => {
    if(err) {
      console.log(err);
    } else {
      console.log("Customer file updated.");
    }
  })
}

app.post("/account", (request, response) => {
  const { name, cpf } = request.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if(customerAlreadyExists) {
    return response.status(400).json({error: "Customer already exists!"});
  }

  const customer = {
    name,
    cpf,
    id: uuidv4(),
    statement: []
  }

  customers.push(customer);

  updateCustomerFile();
  return response.status(201).json(customer);
})

app.get("/statement",verifyIfExistsAccountCPF, (request, response) => {    
  const {customer}  = request;
  
  return response.json(customer.statement);
})

app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
  const {customer} = request;
  const { description, amount } = request.body;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit'
  }

  customer.statement.push(statementOperation);

  updateCustomerFile();
  return response.status(201).send();
})

app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if(balance < amount) {
    return response.status(400).json({error: "Insufficient funds!"})
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit"
  };

  customer.statement.push(statementOperation);

  updateCustomerFile();
  return response.status(201).send();
})

app.get("/statement/date",verifyIfExistsAccountCPF, (request, response) => {    
  const {customer}  = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter((customer) => 
    customer.created_at.toDateString() === new Date(dateFormat).toDateString()
  );

  return response.json(statement);
})

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { name } = request.body;

  customer.name = name;

  updateCustomerFile();
  return response.json(customer);
})

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer);
})

app.get("/account/all", (request, response) => {
  return response.json(customers);
})

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  // splice
  customers.splice(customer, 1);

  updateCustomerFile();
  return response.status(204).send();
})

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json(balance);
})

app.listen(3333, () => {console.log('Aplicação rodando na porta 3333')});