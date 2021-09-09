import axios, { AxiosInstance, AxiosResponse } from "axios";
import { handleNetworkError, Hash, } from "boa-sdk-ts";
import { URL } from "url";
import { IMetaData, IProposalAssessResult, IProposalAttachment } from "../../Types";
import moment from "moment";

export class VoteraClient {
    /**
     * The network endpoint to connect to Votera
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
     * Request Votera for Proposal data
     * @params The proposal_id for requesting votera.
     */
    public getProposalData(proposal_id: string): Promise<IMetaData> {
        return new Promise<IMetaData>((resolve, reject) => {
            this.client.get(`/votera-proposal/${proposal_id}`).then((response: AxiosResponse) => {
                if (response.status === 200) {
                    let proposal_attachments: IProposalAttachment[] = [];
                    response.data.attachment.forEach((element: any) => {
                        proposal_attachments.push({
                            attachment_id: element.id,
                            name: element.name,
                            url: element.url,
                            mime: element.mime,
                            doc_hash: element.doc_hash
                        })
                    });
                    let assessResult: IProposalAssessResult = {
                        assess_node_count: response.data.assessResult.nodeCount,
                        assess_average_score: response.data.assessResult.average,
                        assess_completeness_score: response.data.assessResult.completeness,
                        assess_realization_score: response.data.assessResult.realization,
                        assess_profitability_score: response.data.assessResult.profitability,
                        assess_attractiveness_score: response.data.assessResult.attractiveness,
                        assess_expansion_score: response.data.assessResult.expansion,
                    }
                    let metadata: IMetaData;
                    metadata = {
                        proposal_id: proposal_id,
                        voting_start_date: moment(response.data.votePeriod.begin).utc().unix(),
                        voting_end_date: moment(response.data.votePeriod.end).utc().unix(),
                        voting_fee_hash: new Hash(response.data.tx_hash_vote_fee),
                        detail: response.data.description,
                        submit_time: moment(response.data.createdAt).utc().unix(),
                        ave_pre_evaluation_score: response.data.assessResult.average,
                        pre_evaluation_start_time: moment(response.data.assessPeriod.begin).utc().unix(),
                        pre_evaluation_end_time: moment(response.data.assessPeriod.end).unix(),
                        proposer_name: response.data.creator.username,
                        assessResult: assessResult,
                        proposal_attachments: proposal_attachments,

                    }

                    resolve(metadata);
                }
                else reject(handleNetworkError({ response }));
            })
                .catch((reason: any) => {
                    reject(handleNetworkError(reason));
                });

        });
    }
}
