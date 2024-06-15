function GetCookie(url, name) {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url: url, name: name }, function (cookie) {
      if (cookie) {
        resolve(cookie.value);
      } else {
        reject("Cookie not found");
      }
    });
  });
}

async function GetSchoolId(MashovIdmTokenID) {
  const url = "https://web.mashov.info/api/idm/token";
  const headers = {
    accept: "application/json",
    cookie: "MashovIdmTokenID=" + MashovIdmTokenID + ";",
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error("Network response failed: " + response.statusText);
    }

    const data = await response.json();
    const schoolId = data.schoolsSemels[0];
    return schoolId;
  } catch (error) {
    console.error("Error fetching school ID:", error);
    throw error;
  }
}

async function GetStudentId(MashovIdmTokenID) {
  return new Promise((resolve, reject) => {
    if (MashovIdmTokenID == "Not Found.") {
      //document.getElementById("StudentId").innerText = MashovIdmTokenID;
      reject("MashovIdmTokenID not found.");
    } else {
      const headers = {
        accept: "application/json",
        "content-type": "application/json",
        cookie: "MashovIdmTokenID=" + MashovIdmTokenID,
      };

      const currentYear = new Date().getFullYear();
      GetSchoolId(MashovIdmTokenID)
        .then(async (schoolId) => {
          const response = await fetch(
            `https://web.mashov.info/api/idm/login/${schoolId}/${currentYear}`,
            {
              method: "GET",
              headers: headers,
            }
          );

          if (!response.ok) {
            throw new Error("Network response failed: " + response.statusText);
          }

          const data = await response.json();
          const credentials = data.credential;
          const userId = credentials.userId;
          //document.getElementById("StudentId").innerText = userId;
          resolve(userId);
        })
        .catch((error) => {
          console.error(
            "An error occurred while trying to get student id: " + error
          );
          //document.getElementById("StudentId").innerText = error.message || error;
          reject(error);
        });
    }
  });
}

async function UpdateDisplayName(MashovIdmTokenID) {
  const url = "https://web.mashov.info/api/idm/token";
  const headers = {
    accept: "application/json",
    cookie: "MashovIdmTokenID=" + MashovIdmTokenID + ";",
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error("Network response failed: " + response.statusText);
    }

    const data = await response.json();
    const displayName = data.displayName;

    document.getElementById("display_name").innerText =
      "Welcome, " + displayName + "!";

    return displayName;
  } catch (error) {
    console.error("Error fetching Display name:", error);
    document.getElementById("display_name").innerText = "Welcome, guest!";
    throw error;
  }
}

function toUnicodeCodePoints(str) {
  return Array.from(str).map((char) => char.charCodeAt(0));
}

function compareCodePoints(array1, array2) {
  if (array1.length !== array2.length) return false;
  for (let i = 0; i < array1.length; i++) {
    if (array1[i] !== array2[i]) return false;
  }
  return true;
}

async function GetGrades(MashovIdmTokenID) {
  try {
    const studentId = await GetStudentId(MashovIdmTokenID);
    const Csrf = await GetCookie("https://web.mashov.info/", "Csrf-Token");
    const headers = {
      accept: "application/json",
      "X-Csrf-Token": `${Csrf}`,
      // Cookies are already set for some reason
    };
    const response = await fetch(
      `https://web.mashov.info/api/students/${studentId}/grades`,
      {
        method: "GET",
        headers: headers,
      }
    );

    if (!response.ok) {
      throw new Error("Network response failed: " + response.statusText);
    }

    const data = await response.json();
    let GeometricSum = 1;
    let counter = 0;
    let sum = 0;

    let WeightedSum = {
      Talmidut: 0,
      Exam: 0,
      Works: 0,
    };

    let WeightedCounter = {
      Talmidut: 0,
      Exam: 0,
      Works: 0,
    };

    if (Array.isArray(data)) {
      data.forEach((grade) => {
        let grade_value = parseInt(grade.grade);
        //console.log("Parsed grade value:", grade_value);
        if (!isNaN(grade_value) && typeof grade_value != undefined) {
          GeometricSum *= grade_value;
          sum += grade_value;
          counter++;
          let unicoded = toUnicodeCodePoints(grade.gradeType.trim());

          if (
            compareCodePoints(
              unicoded,
              [1514, 1500, 1502, 1497, 1491, 1493, 1514]
            )
          ) {
            WeightedSum.Talmidut += grade_value;
            WeightedCounter.Talmidut += 1;
          } else if (
            compareCodePoints(
              unicoded,
              [1502, 1489, 1495, 1503, 32, 1489, 1499, 1514, 1489]
            )
          ) {
            WeightedSum.Exam += grade_value;
            WeightedCounter.Exam += 1;
          } else {
            WeightedSum.Works += grade_value;
            WeightedCounter.Works += 1;
          }
        }
      });
      const WeightedAverage =
        0.2 * (WeightedSum.Talmidut / WeightedCounter.Talmidut) +
        0.3 * (WeightedSum.Works / WeightedCounter.Works) +
        0.5 * (WeightedSum.Exam / WeightedCounter.Exam);
      const GeometricAverage = Math.pow(GeometricSum, 1 / counter);
      const ArithmeticAverage = sum / counter;
      const RoundedAverage = 10 * Math.round(WeightedAverage / 10);
      console.log(`Total: ${sum}, GradesAmm: ${counter}.`);
      console.log(`ArithmeticAverage is ${ArithmeticAverage}`);
      console.log(`GeometricAverage is ${GeometricAverage}`);
      console.log(`WeightedAverage is ${WeightedAverage}`);

      const circularProgress = document.querySelector(".circular-progress");
      const progressText = document.querySelector(".progress-text");

      circularProgress.style.setProperty("--progress", RoundedAverage);
      progressText.textContent = `${ArithmeticAverage.toFixed(2)}`;

      setTimeout(() => {
        progressText.style.opacity = 1;
      }, 2000);

      document.getElementById(
        "Average"
      ).innerText = `Your final grade this year is ${ArithmeticAverage.toFixed(
        2
      )}!`;
    } else {
      console.error("Data is not an array of JSON objects:", data);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function refresh() {
  try {
    console.log("Starting proccess...");
    const url = "https://web.mashov.info/";
    const cookies = {
      MashovIdmTokenID: "",
      MashovAuthToken: "",
      "Csrf-Token": "",
    };

    for (const element in cookies) {
      const cookie_value = await GetCookie(url, element);
      if (cookie_value != "Cookie not found") {
        //document.getElementById(element + "-display").innerText ="Cookie" + element + " Was found.";
        //document.getElementById(element + "-display").innerText = cookie_value;
        cookies[element] = cookie_value;
        if (element == "MashovIdmTokenID") {
          GetStudentId(cookie_value);
        }
        console.log(element + ": " + cookie_value);
      } else {
        //document.getElementById(element + "-display").innerText = "Cookie" + element + " Was not found.";
        if (element == "MashovIdmTokenID") {
          GetStudentId("Not Found.");
        }
      }
    }

    UpdateDisplayName(cookies.MashovIdmTokenID);

    GetGrades(
      cookies.MashovIdmTokenID,
      cookies.MashovAuthToken,
      cookies["Csrf-Token"]
    );
  } catch (error) {
    console.error("Err inside refresh: " + error);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  refresh();
});

document.getElementById("myButton").addEventListener("click", myFunc);

function myFunc() {
  console.log("Button clicked!");
  refresh(); // Assuming refresh() is defined elsewhere
}
