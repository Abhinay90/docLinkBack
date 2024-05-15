const cron = require("node-cron");
const sendNotification = require("./sendNotification.utils");

const createCronjob = ({ schedule, task, deviceToken }) => {
  const temp = cron.schedule(schedule, async function(){
    try{
        if (task?.taskType === "medicine") {
            const message = `Please take ${task?.name} medicine dosage ${task?.dosage}`;
            const notify = await sendNotification({
                type: task?.taskType,
                body: message,
                data:{},
                deviceToken,
              });
          
            console.log(message);
        } else if (task?.taskType === "exercise") {
          const message = `It's time for your ${task?.name} exercise `;
          const notify = await sendNotification({
            type: task?.taskType,
            body: message,
            data: {},
            deviceToken,
          });
          console.log(message);
        } else if (task?.taskType === "diet") {
          const message = `Please follow the diet ${task?.name} in ${task?.partOfDay}`;
          console.log("diet");
        }
        console.log("cron started");
      }catch(err){
          console.log(err)
        }
  });

  temp.start();
};

//  function fn({ schedule, task, deviceToken }) {
    
// }

module.exports = createCronjob;
