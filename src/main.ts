import "./style.css";

const app: HTMLDivElement = document.querySelector("#app")!;

const alertButton = document.createElement("button");
alertButton.innerHTML = "Click me!";
alertButton.style.backgroundColor = "pink";
alertButton.addEventListener("click", () => {
  alert("You clicked the button!");
});

app.append(alertButton);
