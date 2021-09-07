const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');
const { STRING } = Sequelize;
const config = {
  logging: false
};
const jwt = require('jsonwebtoken');
const tokenSecret = process.env.JWT;

if(process.env.LOGGING){
  delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

const User = conn.define('user', {
  username: STRING,
  password: STRING
});

const Note = conn.define('note', {
  text: STRING
})


Note.belongsTo(User);
User.hasMany(Note);

User.byToken = async(token)=> {

  try {
    const verified = jwt.verify(token, tokenSecret)
    const user = await User.findByPk(verified.userId);
    if(user){
      return user;
    }
  }
  catch(ex){
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async({ username, password })=> {

  const user = await User.findOne({
    where: {
      username,
      // password
    }
  });

  const verifyPassword = await bcrypt.compare(password, user.password);

  if(verifyPassword === true){
    return jwt.sign({userId: user.id}, process.env.JWT);
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

User.beforeCreate(async (user) => {
  const saltRounds = 10;
  let hashed = bcrypt.hashSync(user.getDataValue('password'), saltRounds);
  user.setDataValue('password', hashed);
});

const syncAndSeed = async()=> {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw'},
    { username: 'moe', password: 'moe_pw'},
    { username: 'larry', password: 'larry_pw'}
  ];


  const [lucy, moe, larry] = await Promise.all(
    credentials.map( credential => User.create(credential))
  );

  await Note.create({
    text: 'text',
    userId: lucy.id
  })

  await Note.create({
    text: 'text',
    userId: moe.id
  })

  await Note.create({
    text: 'text',
    userId: larry.id
  })

  return {
    users: {
      lucy,
      moe,
      larry
    }
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User
  }
};
