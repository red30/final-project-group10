db = db.getSiblingDB('users');	// use <db> syntax doesn't work in js

db.createUser({
  user: "group10",
  pwd: "hunter2",
  roles: [ { role: "readWrite", db: "users" } ]
});

//NOTE: passwords are prehashed versions of "password"
db.users.insertOne({ 
	userID: "init_user1", 
	email: "init_user1@gmail.com", 
	password: "$2a$08$VaaE1RdyjCfbAEeBwMy1vOaGN8uFFgSIh68u4kkr9cEIcos2cHNZi", 
	albums: [  ],
	photos: [  ]
});
db.users.insertOne({ 
	userID: "init_user2", 
	email: "init_user2@gmail.com", 
	password: "$2a$08$VaaE1RdyjCfbAEeBwMy1vOaGN8uFFgSIh68u4kkr9cEIcos2cHNZi", 
	albums: [  ],
	photos: [  ]
});
db.users.insertOne({ 
	userID: "init_user3", 
	email: "init_user3@gmail.com", 
	password: "$2a$08$VaaE1RdyjCfbAEeBwMy1vOaGN8uFFgSIh68u4kkr9cEIcos2cHNZi", 
	albums: [  ],
	photos: [  ]
});
db.users.insertOne({ 
	userID: "init_user4", 
	email: "init_user4@gmail.com", 
	password: "$2a$08$VaaE1RdyjCfbAEeBwMy1vOaGN8uFFgSIh68u4kkr9cEIcos2cHNZi", 
	albums: [  ],
	photos: [  ]
});
db.users.insertOne({ 
	userID: "init_user5", 
	email: "init_user5@gmail.com", 
	password: "$2a$08$VaaE1RdyjCfbAEeBwMy1vOaGN8uFFgSIh68u4kkr9cEIcos2cHNZi", 
	albums: [  ],
	photos: [  ]
});
db.users.insertOne({ 
	userID: "init_user6", 
	email: "init_user6@gmail.com", 
	password: "$2a$08$VaaE1RdyjCfbAEeBwMy1vOaGN8uFFgSIh68u4kkr9cEIcos2cHNZi", 
	albums: [  ],
	photos: [  ]
});
db.users.insertOne({ 
	userID: "init_user7", 
	email: "init_user7@gmail.com", 
	password: "$2a$08$VaaE1RdyjCfbAEeBwMy1vOaGN8uFFgSIh68u4kkr9cEIcos2cHNZi", 
	albums: [  ],
	photos: [  ]
});
db.users.insertOne({ 
	userID: "init_user8", 
	email: "init_user8@gmail.com", 
	password: "$2a$08$VaaE1RdyjCfbAEeBwMy1vOaGN8uFFgSIh68u4kkr9cEIcos2cHNZi", 
	albums: [  ],
	photos: [  ]
});
db.users.insertOne({ 
	userID: "init_user9", 
	email: "init_user9@gmail.com", 
	password: "$2a$08$VaaE1RdyjCfbAEeBwMy1vOaGN8uFFgSIh68u4kkr9cEIcos2cHNZi", 
	albums: [  ],
	photos: [  ]
});
db.users.insertOne({ 
	userID: "init_user10", 
	email: "init_user10@gmail.com", 
	password: "$2a$08$VaaE1RdyjCfbAEeBwMy1vOaGN8uFFgSIh68u4kkr9cEIcos2cHNZi", 
	albums: [  ],
	photos: [  ]
});
db.users.insertOne({ 
	userID: "init_use11", 
	email: "init_user11@gmail.com", 
	password: "$2a$08$VaaE1RdyjCfbAEeBwMy1vOaGN8uFFgSIh68u4kkr9cEIcos2cHNZi", 
	albums: [  ],
	photos: [  ]
});
db.users.insertOne({ 
	userID: "init_user12", 
	email: "init_user12@gmail.com", 
	password: "$2a$08$VaaE1RdyjCfbAEeBwMy1vOaGN8uFFgSIh68u4kkr9cEIcos2cHNZi", 
	albums: [  ],
	photos: [  ]
});

db.users.createIndex({ userID: 1 }, { unique: true });