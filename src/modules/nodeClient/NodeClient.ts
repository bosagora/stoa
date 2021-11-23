import axios, { AxiosInstance, AxiosResponse } from "axios";
import { handleNetworkError } from "boa-sdk-ts";
import { URL } from "url";
import { INodeInformation } from "../../Types";
import moment from "moment";

export class NodeClient {
    /**
     * The network endpoint to connect to Node
     */
    private endpoint: URL;

    /**
     * The instance of the axios
     */
    private client: AxiosInstance;

    constructor(endpoint: URL) {
        this.endpoint = endpoint;
        this.client = axios.create({
            baseURL: endpoint.toString(),
            // Timeout is in ms
            timeout: 10000,
        });
    }

    /**
     * Request for node info
     */
    public getNodeInfo(): Promise<INodeInformation[]> {
        return new Promise<INodeInformation[]>(async (resolve, reject) => {
            let nodes: Array<INodeInformation> = [];
            await this.client.get('/node_info').then(async (response: AxiosResponse) => {
                if (response.status === 200) {
                    const addresses = JSON.parse(response.data.addresses);
                    await Promise.all(addresses.map(async (elem: string) => {
                        const node_info = await this.getNodeAddress(elem);
                        nodes.push(node_info);
                    }));
                    resolve(nodes);
                }
                else reject(handleNetworkError({ response }));
            })
                .catch((reason: any) => {
                    reject(handleNetworkError(reason));
                });

        });
    }

    /**
     * Request for node address
     * @param URL of the node
     */
    public getNodeAddress(url: string): Promise<INodeInformation> {
        return new Promise<INodeInformation>(async (resolve, reject) => {
            const nodeUrl = url.split(':')[1];
            let protocol = this.endpoint.toString().includes('https');
            let node_protocol: string;
            if (protocol) {
                node_protocol = 'https';
            } else {
                node_protocol = 'http';
            }
            await axios.get(`${node_protocol}:${nodeUrl}/public_key`).then(async (response: AxiosResponse) => {
                if (response.status === 200) {
                    const block_height = await this.getNodeHeight(nodeUrl, node_protocol);
                    const node_info: INodeInformation = {
                        public_key: response.data.key,
                        URL: url,
                        block_height: block_height,
                        port: url.split(':')[2],
                        utxo: response.data.utxo,
                        update_time: moment().utc().unix().toString()
                    }
                    resolve(node_info);
                }
                else reject(handleNetworkError({ response }));
            })
                .catch((reason: any) => {
                    reject(handleNetworkError(reason));
                });

        });
    }

    /**
     * Request for node height
     * @param URL of the node
     * @param node_protocol Protocol of the URL 'http' or 'https'
     */
    public getNodeHeight(url: string, node_protocol: string): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            await axios.get(`${node_protocol}:${url}/block_height`).then((response: AxiosResponse) => {
                if (response.status === 200) {
                    resolve(response.data);
                }
                else reject(handleNetworkError({ response }));
            })
                .catch((reason: any) => {
                    reject(handleNetworkError(reason));
                });

        });
    }
}
