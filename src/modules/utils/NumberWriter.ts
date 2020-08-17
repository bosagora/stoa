import { SmartBuffer } from "smart-buffer";

const number_type: Array<number> = [0xFC, 0xFD, 0xFE, 0xFF];

/**
 * The class that defines the writer of a number.
 */
export class NumberWriter
{
    /**
     * Serialize the number
     * @param value The number to serialize
     * @param buffer The byte buffer
     */
    public static serialize (value: number, buffer: SmartBuffer)
    {
        if (value <= number_type[0])
        {
            buffer.writeUInt8(value);
        }
        else if (value <= 0xFFFF)
        {
            buffer.writeUInt8(number_type[1]);
            buffer.writeUInt16LE(value);
        }
        else if (value <= 0xFFFFFFFF)
        {
            buffer.writeUInt8(number_type[2]);
            buffer.writeUInt32LE(value);
        }
        else
        {
            buffer.writeUInt8(number_type[3]);
            buffer.writeBigUInt64LE(BigInt(value));
        }
    }

    /**
     * Deserialize the number
     * @param buffer The byte buffer
     * @returns The deserialized number
     */
    public static deserialize (buffer: SmartBuffer): number
    {
        let value = buffer.readUInt8();

        if (value <= number_type[0])
        {
            return value;
        }
        else if (value == number_type[1])
        {
            return buffer.readUInt16LE();
        }
        else if (value == number_type[2])
        {
            return buffer.readUInt32LE();
        }
        else
        {
            return Number(buffer.readBigUInt64LE());
        }
    }
}
