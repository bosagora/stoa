import mongoose, { Document } from 'mongoose';

/**
* Blacklist interface 
*/
interface IBlacklist {
    ipAddress: string,
    description: string
}
/**
* Mongoose schema for blacklist Ip
*/
const blacklistSchema = new mongoose.Schema<IBlacklist>(
    {
        ipAddress: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true,
    }
)
const Blacklist = mongoose.model<IBlacklist & Document>('Blacklist', blacklistSchema);
export default Blacklist;
