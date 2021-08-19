import { EventDispatcher, EventSubscriber, On } from "event-dispatch";
import { Socket } from "socket.io";
import events from "./events";

@EventSubscriber()
export default class Handler {
    /**
     * Instance of event Dispatcher
     */
    protected eventDispatcher: EventDispatcher;

    constructor() {
        this.eventDispatcher = new EventDispatcher();
    }

    @On(events.client.connection)
    public async connectionHandler(socket: Socket) {
        socket.onAny((event, data) => {
            this.eventDispatcher.dispatch(event, data);
        });
    }

    @On(events.client.ping)
    public async pingHandler() {
        // TODO: yet to define
    }
}
