import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
/**
* User interface 
*/
interface IUser {
  name: string,
  email: string,
  password: string,
  resetPasswordToken: any,
  resetPasswordExpires: any,
  isVerified: boolean,
  generatePasswordReset(): any;
}
/**
* Mongoose schema for Admin user 
*/
const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    resetPasswordToken: {
      type: String,
      required: false
    },
    resetPasswordExpires: {
      type: Number,
    },
    isVerified: {
      type: Boolean,
      default: false
    },
  },
  {
    timestamps: true,
  }
)
userSchema.methods.generatePasswordReset = function () {
  this.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordExpires = Date.now() + 3600000; //expires in an hour
};
const User = mongoose.model<IUser & Document>('User', userSchema);
export default User;