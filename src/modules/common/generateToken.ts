import jwt from 'jsonwebtoken'

const generateToken = (email: any) => {
  return jwt.sign({ email }, 'my secret', {
    expiresIn: '30d',
  })
}

export default generateToken