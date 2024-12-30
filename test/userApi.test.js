const chai = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const request = require('supertest');
const app = require('../server.js'); // Ensure your Express app is exported from server.js
const pool = require('../db/db.js');

const { expect } = chai;

describe('User API', () => {
    let token;
    let sandbox;

    before(async () => {
        sandbox = sinon.createSandbox();
        // Mock the database interactions
        sandbox.stub(pool, 'query').callsFake(async (query, values) => {
            if (query.includes('SELECT * FROM users WHERE userId = $1')) {
                if (values[0] === 1) {
                    return { rows: [{ userid: 1, password: await bcrypt.hash('testpassword', 10) }] };
                } else {
                    return { rows: [] };
                }
            } else if (query.includes('INSERT INTO users')) {
                return { rows: [{ userid: values[0], firstname: values[1], lastname: values[2], email: values[3], designation: values[4], dateofbirth: values[5], supervisor: values[6], password: values[7] }] };
            } else if (query.includes('UPDATE users SET')) {
                return { rows: [{ userid: values[6], firstname: values[0], lastname: values[1], email: values[2], designation: values[3], dateofbirth: values[4], supervisor: values[5] }] };
            } else if (query.includes('DELETE FROM users WHERE userId = $1')) {
                return { rows: [{ userid: values[0], firstname: 'Test', lastname: 'User' }] };
            } else if (query.includes('SELECT * FROM users')) {
                return { rows: [{ userid: 1, firstname: 'Test', lastname: 'User', email: 'testuser@example.com', designation: 'Tester', dateofbirth: '1990-01-01', supervisor: 'Supervisor' }] };
            } else if (query.includes('SELECT * FROM leaves WHERE leaveId = $1')) {
                if (values[0] === 1) {
                    return { rows: [{ leaveid: 1, from: '2023-01-01', to: '2023-01-10', type: 'Sick', reason: 'Flu', emergencycontact: '1234567890', userid: 1 }] };
                } else {
                    return { rows: [] };
                }
            } else if (query.includes('INSERT INTO leaves')) {
                return { rows: [{ leaveid: values[0], from: values[1], to: values[2], type: values[3], reason: values[4], emergencycontact: values[5], userid: values[6] }] };
            } else if (query.includes('UPDATE leaves SET')) {
                return { rows: [{ leaveid: values[6], from: values[0], to: values[1], type: values[2], reason: values[3], emergencycontact: values[4], userid: values[5] }] };
            } else if (query.includes('DELETE FROM leaves WHERE leaveId = $1')) {
                return { rows: [{ leaveid: values[0], from: '2023-01-01', to: '2023-01-10', type: 'Sick', reason: 'Flu', emergencycontact: '1234567890', userid: 1 }] };
            } else if (query.includes('SELECT * FROM leaves')) {
                return { rows: [{ leaveid: 1, from: '2023-01-01', to: '2023-01-10', type: 'Sick', reason: 'Flu', emergencycontact: '1234567890', userid: 1 }] };
            }
            return { rows: [] };
        });

        token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET, { expiresIn: '48h' });
    });

    after(() => {
        sandbox.restore();
    });

    describe('Simple Test', () => {
        it('should run this simple test', () => {
            expect(true).to.be.true;
        });

        it('should verify supertest is working', (done) => {
            request(app)
                .get('/api/users')
                .expect(401, done); // Expecting unauthorized since no token is provided
        });
    });

    describe('POST /login', () => {
        it('should login a user and return a token', (done) => {
            request(app)
                .post('/api/login')
                .send({ userId: 1, password: 'testpassword' })
                .expect(200)
                .expect((res) => {
                    expect(res.body).to.have.property('token');
                })
                .end(done);
        });

        it('should return 404 for non-existing user', (done) => {
            request(app)
                .post('/api/login')
                .send({ userId: 999, password: 'testpassword' })
                .expect(404)
                .expect((res) => {
                    expect(res.body).to.have.property('error', 'User not found');
                })
                .end(done);
        });

        it('should return 401 for invalid password', (done) => {
            request(app)
                .post('/api/login')
                .send({ userId: 1, password: 'wrongpassword' })
                .expect(401)
                .expect((res) => {
                    expect(res.body).to.have.property('error', 'Invalid password');
                })
                .end(done);
        });
    });

    describe('GET /users', () => {
        it('should list all users', (done) => {
            request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).to.be.an('array');
                })
                .end(done);
        });
    });

    describe('POST /users', () => {
        it('should add a new user', (done) => {
            request(app)
                .post('/api/users')
                .send({
                    userId: 2,
                    firstName: 'New',
                    lastName: 'User',
                    email: 'newuser@example.com',
                    designation: 'Developer',
                    dateOfBirth: '1995-01-01',
                    supervisor: 'Supervisor',
                    password: 'newpassword'
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).to.have.property('userid', 2);
                })
                .end(done);
        });
    });

    describe('PUT /users/:userId', () => {
        it('should update a user', (done) => {
            request(app)
                .put('/api/users/1')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    firstName: 'Updated',
                    lastName: 'User',
                    email: 'updateduser@example.com',
                    designation: 'Updated Tester',
                    dateOfBirth: '1990-01-01',
                    supervisor: 'Updated Supervisor'
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body).to.have.property('firstname', 'Updated');
                })
                .end(done);
        });
    });

    describe('DELETE /users/:userId', () => {
        it('should delete a user', (done) => {
            request(app)
                .delete('/api/users/2')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).to.have.property('message').that.includes('deleted successfully');
                })
                .end(done);
        });
    });

    describe('GET /users/:userId', () => {
        it('should get a specific user', (done) => {
            request(app)
                .get('/api/users/1')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).to.have.property('userid', 1);
                })
                .end(done);
        });
    });

    // ----- LEAVES API -----

    describe('GET /leaves', () => {
        it('should list all leaves', (done) => {
            request(app)
                .get('/api/leaves')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).to.be.an('array');
                })
                .end(done);
        });
    });

    describe('POST /leaves', () => {
        it('should add a new leave', (done) => {
            request(app)
                .post('/api/leaves')
                .send({
                    from: '2023-01-01',
                    to: '2023-01-10',
                    type: 'Sick',
                    reason: 'Flu',
                    emergencyContact: '1234567890',
                    userId: 1
                })
                .set('Authorization', `Bearer ${token}`)
                .expect(201)
                .expect((res) => {
                    expect(res.body).to.have.property('leaveid');
                })
                .end(done);
        });
    });

    describe('PUT /leaves/:leaveId', () => {
        it('should update a leave', (done) => {
            request(app)
                .put('/api/leaves/1')
                .send({
                    from: '2023-01-01',
                    to: '2023-01-15',
                    type: 'Sick',
                    reason: 'Severe Flu',
                    emergencyContact: '1234567890',
                    userId: 1
                })
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).to.have.property('from', '2023-01-01');
                    expect(res.body).to.have.property('to', '2023-01-15');
                })
                .end(done);
        });
    });

    describe('DELETE /leaves/:leaveId', () => {
        it('should delete a leave', (done) => {
            request(app)
                .delete('/api/leaves/1')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).to.have.property('message').that.includes('deleted successfully');
                })
                .end(done);
        });
    });

   
});
