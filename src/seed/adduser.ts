import * as Users from "../models/users";
import * as logger from "../models/logs";

export function createUserOnStartUp(){
    let userObj = {
        name : "Data CT Admin",
        userId: "admin@datact.com",
        password : "admin@1234",
        phone : "1234567890",
        role : Users.ROLE.ADMIN
    };

    Users.findByUserId(userObj.userId, (err,result) => {
        if(err){
            logger.error(logger.DEFAULT_MODULE,null,"error = "+err);
            return; 
        }
        if(!result){
            Users.createUser(userObj,(err,data) =>{
                if(err){
                    logger.error(logger.DEFAULT_MODULE,null,"error = "+err);
                }else{
                    logger.debug(logger.DEFAULT_MODULE,null,"Created user on start up");
                }
            });
        }
    });
}