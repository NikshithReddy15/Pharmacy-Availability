const express = require('express');
const { createServer } = require("http");
const { Server } = require("socket.io");
const expressSessions = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const dbCountriesCitiesStates = require("./dbCountriesCitiesStates");
const dbPharmacy = require("./dbPharmacy");
const dbCustomer = require("./dbCustomer");
const dbOrders = require("./dbOrders");
const { application } = require('express');
const res = require('express/lib/response');

/*app.listen(9000, () => {
    console.log("Listening on port 9000...");
});*/

httpServer.listen(9000, () => {
    console.log("Listening on port 9000...");
});

app.set('view engine', 'ejs');
app.use(expressSessions({
    secret: 'noFfdgnBdAdddgndvb9474T78nbJRFjhfdDHIjDdd',
    saveUninitialized: true,
    cookie: {
        maxAge: 1000*60*60*12
    },
    resave: false
}));
//app.use(cookieParser);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static('public'));

io.sockets.on("connection", (socket) => {
    console.log("Connected: "+socket.id);
    
    socket.on('disconnect', () => {
        console.log("disconnected: "+socket.id);//+", "+socket.handshake.sessionID);
    })

    socket.on('retreiveStock', (data) => {
        dbPharmacy.query('select *from pharmacy_stock where id='+data.id+'', (err, res) => {
            //console.log(res);
            io.sockets.emit('sendStock', {data: res});
        });
    });

    socket.on('deleteStock', (data) => {
        dbPharmacy.query('delete from pharmacy_stock where medicineid='+data.id+'', (err, res) => {
            if(err) {
                console.log(err);
            } else {
                console.log("Deleted");
            }
        })
    });

    socket.on('retreiveOrders', (data) => {
        dbOrders.query('select o.*, p.name from orders o, pharmacies.pharmacy_database p where o.customer_id='+data.id+' and p.id=o.pharmacy_id', (err, res) => {
            //console.log(res);
            io.sockets.emit('sendOrders', {data: res});
        });
    });

    socket.on('retreivePharmacyOrders', (data) => {
        dbOrders.query('select o.*, c.name, c.phone from orders o, customers.customer_database c where o.pharmacy_id='+data.id+' and c.id = o.customer_id and o.status!="delivered"', (err, res) => {
            //console.log(res);
            io.sockets.emit('sendPharmacyOrders', {data: res});
        });
    });
});



/*===================================================================*/

// -- Home Page
app.get('/', (req, result) => {
    result.render('homePage.ejs');
});



/*===================================================================*/

// -- Pharmacy Module
app.get("/pharmacyLogin", (req, result) => {
    //console.log(req.session.pharmacyDetails)
    if(req.session.pharmacyDetails == undefined) {
        result.render('pharmacyLogin.ejs');
    } else {
        result.redirect('/pharmacyDashboard');
    }
});

app.get("/pharmacyRegistration", (req, result) => {
    dbCountriesCitiesStates.query('select *from countries', (err, res) => {
        if (err) {
            return console.log(err);
        } else {
            result.render('pharmacyRegistration.ejs', {data: res, success: 'Good'});
        }
    });
});

app.post("/addPharmacyLogin", (req, result) => {
    //console.log(req.body.pharmacyName+', '+req.body.pharmacyID+', '+req.body.pharmacyPassword+', '+req.body.country+', '+req.body.state+', '+req.body.city+', '+req.body.pharmacyAddress);

    dbPharmacy.query('select exists(select *from pharmacy_database where username="'+req.body.pharmacyID+'") as bool', (err, res) => {
        if(err) {
            console.log(err);
        } else {
            if(res[0].bool == 1) {
                console.log("Username Already Taken");
                //result.redirect('/pharmacyRegistration');
                result.send('Username Already Taken');
            } else {
                dbPharmacy.query('insert into pharmacy_database (name, username, password, country_id, state_id, city_id, address) values("'+req.body.pharmacyName+'", "'+req.body.pharmacyID+'", SHA1("'+req.body.pharmacyPassword+'"), "'+req.body.country+'", "'+req.body.state+'", "'+req.body.city+'", "'+req.body.pharmacyAddress+'")', (err, res) => {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log("Pharmacy registered");
                        result.redirect('/pharmacyLogin');
                    }
                });
            }
        }
    });
});

app.post("/checkPharmacyLogin", (req, result) => {
    dbPharmacy.query('select *from pharmacy_database a where a.username="'+req.body.pharmacyID+'" and a.password=SHA1("'+req.body.pharmacyPassword+'") and exists(select *from pharmacy_database b where b.username="'+req.body.pharmacyID+'" and b.password=SHA1("'+req.body.pharmacyPassword+'"))', (err, resouter) => {
        if(err) {
            result.send(err);
        } else {
            if(resouter.length > 0) {
                req.session.pharmacyDetails = resouter;
                req.session.save();
                console.log(req.session);
                result.redirect('/pharmacyDashboard');
            } else {
                result.redirect('/pharmacyLogin')
            }
        }
    });
});

app.get("/pharmacyDashboard", (req, result) => {
    if(req.session.pharmacyDetails == undefined) {
        result.render('pharmacyLogin.ejs');
    } else {
        //console.log(req.session.id);
        result.render('pharmacyDashboard.ejs', {details: req.session.pharmacyDetails, success: 'Good'});
    }
});

app.get('/depletedStock', (req, result) => {
    if(req.session.pharmacyDetails == undefined) {
        result.render('pharmacyLogin.ejs');
    } else {
        result.render('depletedStockDashboard.ejs', {details: req.session.pharmacyDetails, success: 'Good'});
    }
});

app.get("/pharmacyProfileInfo", (req, result) => {
    if(req.session.pharmacyDetails == undefined) {
        result.render('pharmacyLogin.ejs');
    } else {
        result.render('pharmacyProfileInfo.ejs', {details: req.session.pharmacyDetails, success: 'Good'});
    }
});

app.get("/updatePharmacyPassword", (req, result) => {
    if(req.session.pharmacyDetails == undefined) {
        result.render('pharmacyLogin.ejs');
    } else {
        result.render('updatePharmacyPassword.ejs', {details: req.session.pharmacyDetails, success: 'Good'});
    }
});

app.post("/oldPharmacyPasswordChecker", (req, result) => {
    //console.log(req.session.pharmacyDetails[0].username+", "+req.body.oldPassword);
    dbPharmacy.query('select exists(select *from pharmacy_database where username="'+req.session.pharmacyDetails[0].username+'" and password=SHA1("'+req.body.oldPassword+'")) as boolean', (err, res) => {
        if(err) {
            console.log(err)
            result.json({
                msg: 'error'
            });
        } else {
            result.json({
                msg: 'success',
                res: res
            });
        }
    });
});

app.post("/changePharmacyPassword", (req, result) => {
    dbPharmacy.query('update pharmacy_database set password=SHA1("'+req.body.newPassword+'") where username="'+req.session.pharmacyDetails[0].username+'"', (err, res) => {
        if(err) {
            result.send(err);
        } else {
            result.redirect('/pharmacyDashboard');
        }
    });
});

app.get('/addMedicinePage', (req, result) => {
    if(req.session.pharmacyDetails == undefined) {
        result.render('pharmacyLogin.ejs');
    } else {
        result.render('addMedicine.ejs', {details: req.session.pharmacyDetails, success: 'Good'});
    }
});

app.post('/addMedicine', (req, result) => {
    dbPharmacy.query('insert into pharmacy_stock(id, category, medicine, stock, costprice, sellingprice) values('+req.session.pharmacyDetails[0].id+', "'+req.body.category+'", "'+req.body.name+'", "'+req.body.stock+'", "'+req.body.costprice+'", "'+req.body.sellingprice+'")', (err, res) => {
        if(err) {
            result.send(err);
        } else {
            result.redirect('/pharmacyDashboard');
        }
    });
});

app.post('/deleteMedicine', (req, result) => {
    dbPharmacy.query('delete from pharmacy_stock where medicineid='+req.body.id+'', (err, res) => {
        if(err) {
            result.json({
                msg: err
            });
        } else {
            result.json({
                msg: 'success'
            });
        }
    });
});

app.post('/updateMedicine', (req, result) => {
    dbPharmacy.query('update pharmacy_stock set stock='+req.body.newStock+' where medicineid='+req.body.id+'', (err, res) => {
        if(err) {
            result.json({
                msg: 'error'
            });
        } else {
            result.json({
                msg: 'success'
            });
        }
    });
});

app.get('/updateStockPage', (req, result) => {
    if(req.session.pharmacyDetails == undefined) {
        result.render('pharmacyLogin.ejs');
    } else {
        dbPharmacy.query('select *from pharmacy_stock where id='+req.session.pharmacyDetails[0].id+'', (err, res) => {
            if(err) {
                result.send(err);
            } else {
                //console.log(res);
                result.render('updateStock.ejs', {data: res, details: req.session.pharmacyDetails, success: 'Good'});
            }
        })
    }
});

app.post('/getMedicineStock', (req, result) => {
    dbPharmacy.query('select *from pharmacy_stock where medicineid='+req.body.medicineid+'', (err, res) => {
        if(err) {
            result.json({
                msg: 'error'
            });
        } else {
            result.json({
                msg: 'success',
                stock: res
            });
        }
    })
})

app.post('/updateStock', (req, result) => {
    //console.log(req.body);
    dbPharmacy.query('update pharmacy_stock set category="'+req.body.medicineCategory+'", medicine="'+req.body.medicineName+'", stock="'+req.body.medicineStock+'", costprice="'+req.body.medicineCostPrice+'", sellingprice="'+req.body.medicineSellingPrice+'" where medicineid="'+req.body.medicineID+'"', (err, res) => {
        if(err) {
            result.send(err);
        } else {
            result.redirect('/pharmacyDashboard');
        }
    });
});

app.get('/deletePharmacyPage', (req, result) => {
    if(req.session.pharmacyDetails == undefined) {
        result.render('pharmacyLogin.ejs');
    } else {
        result.render('deletePharmacy.ejs', {details: req.session.pharmacyDetails, success: 'Good'});
    }
});

app.post('/deletePharmacy', (req, result) => {
    if(req.session.pharmacyDetails == undefined) {
        result.render('pharmacyLogin.ejs');
    } else {
        dbPharmacy.query('delete from pharmacy_database where id='+req.session.pharmacyDetails[0].id+'', (err, res) => {
            if(err) {
                result.send(err);
            } else {
                result.redirect('/pharmacyLogout');
            }
        });
    }
});

app.get('/pharmacyOrdersPage', (req, result) => {
    if(req.session.pharmacyDetails == undefined) {
        result.render('pharmacyLogin.ejs');
    } else {
        result.render('pharmacyOrders.ejs', {details: req.session.pharmacyDetails, success: 'Good'});
    }
});

app.post('/dispatchOrder', (req, result) => {
    dbOrders.query('update orders set status="dispatched" where id='+req.body.id+'', (err, res) => {
        if(err) {
            result.json({
                msg: 'error'
            });
        } else {
            result.json({
                msg: 'success'
            });
        }
    });
});

app.post('/deliveredOrder', (req, result) => {
    dbOrders.query('update orders set status="delivered" where id='+req.body.id+'', (err, res) => {
        if(err) {
            result.json({
                msg: 'error'
            });
        } else {
            result.json({
                msg: 'success'
            });
        }
    });
});



/*===================================================================*/

// -- Customer Module
app.get("/customerLogin", (req, result) => {
    //console.log(req.session);
    if(req.session.customerDetails == undefined) {
        result.render('customerLogin.ejs');
    } else {
        result.redirect('/customerDashboard');
    }
});

app.get("/customerRegistration", (req, result) => {
    result.render('customerRegistration.ejs');
});

app.post("/addCustomerLogin", (req, result) => {
    dbCustomer.query('select exists(select *from customer_database where username="'+req.body.customerID+'") as bool', (err, res) => {
        if(err) {
            result.send(err);
        } else {
            console.log(res[0].bool);
            if(res[0].bool == 1) {
                result.send('Username already taken');
            } else {
                //console.log(req.body.customerName+', '+req.body.customerID+', '+req.body.customerPassword+','+req.body.phone);
                dbCustomer.query('insert into customer_database (name, username, password, phone) values("'+req.body.customerName+'", "'+req.body.customerID+'", SHA1("'+req.body.customerPassword+'"), '+req.body.phone+')', (req, res) => {
                    if(err) {
                        result.send(err);
                    } else {
                        result.redirect('/customerLogin');
                    }
                });
            }
        }
        
    });
});

app.post("/checkCustomerLogin", (req, result) => {
    dbCustomer.query('select *from customer_database a where a.username="'+req.body.customerID+'" and a.password=SHA1("'+req.body.customerPassword+'") and exists(select *from customer_database b where b.username="'+req.body.customerID+'" and b.password=SHA1("'+req.body.customerPassword+'"))', (err, resouter) => {
        if(err) {
            result.send(err);
        } else {
            if(resouter.length > 0) {
                req.session.customerDetails = resouter;
                req.session.save();
                console.log(req.session);
                result.redirect('/customerDashboard');
            } else {
                result.redirect('/customerLogin');
            }
        }
    });
});

app.get("/customerDashboard", (req, result) => {
    if(req.session.customerDetails == undefined) {
        result.redirect('/customerLogin');
    } else {
        dbCountriesCitiesStates.query('select *from countries', (err, res) => {
            if(err) {
                result.send(err);
            } else {
                result.render('customerDashboard.ejs', {details: req.session.customerDetails, data:res, success: 'Good'});
            }
        });
    }
});

app.post("/checkMedicineAvailability", (req, result) => {
    dbPharmacy.query('select s.*, d.name, d.city_id, city.name as city, d.state_id, state.name as state, d.country_id, country.name as country from pharmacy_stock s, pharmacy_database d, countries_states_cities.countries country, countries_states_cities.states state, countries_states_cities.cities city where d.country_id="'+req.body.country_id+'" and d.state_id="'+req.body.state_id+'" and d.city_id="'+req.body.city_id+'" and (s.medicine like "%'+req.body.medicineName+'%" or s.category like "%'+req.body.medicineName+'%") and s.id = d.id and d.state_id = state.id and d.city_id = city.id and d.country_id = country.id', (err, res) => {
        if(err) {
            result.json({
                msg: 'error'
            });
        } else {
            if(res.length == 0) {
                dbPharmacy.query('select s.*, d.name, d.city_id, city.name as city, d.state_id, state.name as state, d.country_id, country.name as country from pharmacy_stock s, pharmacy_database d, countries_states_cities.countries country, countries_states_cities.states state, countries_states_cities.cities city where d.country_id="'+req.body.country_id+'" and d.state_id="'+req.body.state_id+'" and (s.medicine like "%'+req.body.medicineName+'%" or s.category like "%'+req.body.medicineName+'%") and s.id = d.id and d.state_id = state.id and d.city_id = city.id and d.country_id = country.id', (err, res) => {
                    if(err) {
                        result.json({
                            msg: 'error'
                        });
                    } else {
                        if(res.length == 0) {
                            dbPharmacy.query('select s.*, d.name, d.city_id, city.name as city, d.state_id, state.name as state, d.country_id, country.name as country from pharmacy_stock s, pharmacy_database d, countries_states_cities.countries country, countries_states_cities.states state, countries_states_cities.cities city where d.country_id="'+req.body.country_id+'" and (s.medicine like "%'+req.body.medicineName+'%" or s.category like "%'+req.body.medicineName+'%") and s.id = d.id and d.state_id = state.id and d.city_id = city.id and d.country_id = country.id', (err, res) => {
                                if(err) {
                                    result.json({
                                        msg: 'error'
                                    });
                                } else {
                                    if(res.length == 0) {
                                        dbPharmacy.query('select s.*, d.name, d.city_id, city.name as city, d.state_id, state.name as state, d.country_id, country.name as country from pharmacy_stock s, pharmacy_database d, countries_states_cities.countries country, countries_states_cities.states state, countries_states_cities.cities city where (s.medicine like "%'+req.body.medicineName+'%" or s.category like "%'+req.body.medicineName+'%") and s.id = d.id and d.state_id = state.id and d.city_id = city.id and d.country_id = country.id', (err, res) => {
                                            if(err) {
                                                result.json({
                                                    msg: 'error'
                                                });
                                            } else {
                                                if(res.length == 0) {
                                                    result.json({
                                                        msg: 'success',
                                                        data: null
                                                    });
                                                } else {
                                                    //console.log(res);
                                                    result.json({
                                                        msg: 'success',
                                                        data: res
                                                    });
                                                }
                                            }
                                        });
                                    } else {
                                        //console.log(res);
                                        result.json({
                                            msg: 'success',
                                            data: res
                                        });
                                    }
                                }
                            });
                        } else {
                            //console.log(res);
                            result.json({
                                msg: 'success',
                                data: res
                            });
                        }
                    }
                });
            } else {
                //console.log(res);
                result.json({
                    msg: 'success',
                    data: res
                });
            }
        }
    });
});

app.get("/customerProfileInfo", (req, result) => {
    if(req.session.customerDetails == undefined) {
        result.redirect('/customerLogin');
    } else {
        result.render('customerProfileInfo.ejs', {details: req.session.customerDetails, success: 'Good'});
    }
});

app.get("/updateCustomerPassword", (req, result) => {
    if(req.session.customerDetails == undefined) {
        result.redirect('/customerLogin');
    } else {
        result.render('updateCustomerPassword.ejs', {details: req.session.customerDetails, success: 'Good'});
    }
});

app.post("/oldCustomerPasswordChecker", (req, result) => {
    //console.log(req.session.customerDetails[0].username+", "+req.body.oldPassword);
    dbCustomer.query('select exists(select *from customer_database where username="'+req.session.customerDetails[0].username+'" and password=SHA1("'+req.body.oldPassword+'")) as boolean', (err, res) => {
        if(err) {
            result.send(err);
            result.json({
                msg: 'error'
            });
        } else {
            result.json({
                msg: 'success',
                res: res
            });
        }
    });
});

app.post("/changeCustomerPassword", (req, result) => {
    dbCustomer.query('update customer_database set password=SHA1("'+req.body.newPassword+'") where username="'+req.session.customerDetails[0].username+'"', (err, res) => {
        if(err) {
            result.send(err);
        } else {
            result.redirect('/customerDashboard');
        }
    });
});

app.get('/deleteCustomerPage', (req, result) => {
    if(req.session.customerDetails == undefined) {
        result.redirect('/customerLogin');
    } else {
        result.render('deleteCustomer.ejs', {details: req.session.customerDetails, success: 'Good'});
    }
});

app.post('/deleteCustomer', (req, result) => {
    if(req.session.customerDetails == undefined) {
        result.redirect('/customerLogin');
    } else {
        dbCustomer.query('delete from customer_database where id='+req.session.customerDetails[0].id+'', (err, res) => {
            if(err) {
                result.send(err);
            } else {
                result.redirect('/customerLogout');
            }
        });
    }
});

app.get('/ordersPage', (req, result) => {
    if(req.session.customerDetails == undefined) {
        result.redirect('/customerLogin');
    } else {
        result.render('orders.ejs', {details: req.session.customerDetails});
    }
});

app.post('/order', (req, result) => {
    if(req.session.customerDetails == undefined) {
        result.redirect('/customerLogin');
    } else {
        dbPharmacy.query('select medicine from pharmacy_stock where medicineid='+req.body.medicineid+'', (err, res) => {
            if(err) {
                result.json({
                    msg: 'success'
                });
            } else {
                var medicine = res[0].medicine;
                //console.log(medicine)
                //console.log(req.session.customerDetails[0].id+', '+req.body.pharmacyid+', '+req.body.medicineid+', '+medicine+', '+req.body.quantity+', "ordered"');
                dbOrders.query('insert into orders (customer_id, pharmacy_id, medicine_id, medicine, quantity, address, status) values('+req.session.customerDetails[0].id+', '+req.body.pharmacyid+', '+req.body.medicineid+', "'+medicine+'", '+req.body.quantity+', "'+req.body.address+'", "ordered")', (err, res) => {
                    if(err) {
                        //console.log(err);
                        result.json({
                            msg: 'success'
                        });
                    } else {
                        //console.log('inserted')
                        dbPharmacy.query('update pharmacy_stock set stock=stock-'+req.body.quantity+' where medicineid='+req.body.medicineid+'', (err, res) => {
                            if(err) {
                                //console.log(err);
                                result.json({
                                    msg: 'success'
                                });
                            } else {
                                //console.log('updated')
                                result.json({
                                    msg: 'success'
                                });
                            }
                        });
                    }
                });
            }
        });
    }
});


/*===================================================================*/

// -- Logout
app.get('/pharmacyLogout', (req, result) => {
    if(req.session.customerDetails == undefined) {
        req.session.destroy((err) => {
            if(err) {
                result.send(err);
            } else {
                //console.log(req.session.pharmacyDetails);
                result.redirect('/');
            }
        });
    } else {
        req.session.pharmacyDetails = undefined;
        result.redirect('/');
    }
});

app.get('/customerLogout', (req, result) => {
    if(req.session.pharmacyDetails == undefined) {
        req.session.destroy((err) => {
            if(err) {
                result.send(err);
            } else {
                //console.log(req.session.pharmacyDetails);
                result.redirect('/');
            }
        });
    } else {
        req.session.customerDetails = undefined;
        result.redirect('/')
    }
});



/*===================================================================*/

// -- GET States and Cities
app.post("/getstates", (req, result) => {
    //console.log("Got state");
    //console.log(req.body.country_id);
    dbCountriesCitiesStates.query("select *from states where country_id = '"+req.body.country_id+"'", (err, res) => {
        if(err) {
            result.json({
                msg: 'error'
            });
        } else {
            result.json({
                msg: 'success',
                states: res
            });
        }
    });
});

app.post("/getcities", (req, result) => {
    //console.log("Got city");
    dbCountriesCitiesStates.query("select *from cities where state_id = '"+req.body.state_id+"'", (err, res) => {
        if(err) {
            result.json({
                msg: 'error'
            });
        } else {
            result.json({
                msg: 'success',
                cities: res
            });
        }
    });
});

/*app.get("/errorPage", (req, result) => {
    result.render('errorpage.ejs');
});*/

/*app.get('/', (req, result) => {
    console.log("Got country");
    db.query('select *from countries', (err, res) => {
        if (err) {
            return console.error();
        } else {
            result.render('placeSearch.ejs', {data: res, success: 'Good'});
        }
    });
});

app.post("/getstates", (req, result) => {
    console.log("Got state");
    console.log(req.body.country_id);
    db.query("select *from states where country_id = '"+req.body.country_id+"'", (err, res) => {
        if(err) {
            result.json({
                msg: 'error'
            });
        } else {
            result.json({
                msg: 'success',
                states: res
            });
        }
    });
});

app.post("/getcities", (req, result) => {
    console.log("Got city");
    db.query("select *from cities where state_id = '"+req.body.state_id+"'", (err, res) => {
        if(err) {
            result.json({
                msg: 'error'
            });
        } else {
            result.json({
                msg: 'success',
                cities: res
            });
        }
    });
});*/

module.exports = app;