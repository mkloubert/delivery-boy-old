import * as deliveryBoy from '../index';
import * as db_contracts from '../contracts';

let client1 = new deliveryBoy.DeliveryBoy();

client1.on('listen.accepted', (conn: db_contracts.IConnection) => {
    conn.sendMessage({
        type: 3,
    }).then((buff) => {
        if (buff) {

        }
    }, (err) => {
        if (err) {

        }
    });
});

client1.start().then((started) => {
    if (started) {

    }
}, (err) => {
    if (err) {

    }
});

let client2 = new deliveryBoy.DeliveryBoy();
client2.connect('localhost').then((conn: db_contracts.IConnection) => {
    conn.readMessage<{type: number}>().then((msg) => {
        if (msg) {
            console.log(msg);
        }
    }, (err) => {
        if (err) {

        }
    });
}, (err) => {
    if (err) {
        
    }
});
