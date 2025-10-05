const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { randomUUID } = require("crypto");

const app = express();

app.use(cors("*"));

const httpServer = createServer(app);

const io = new Server(httpServer);

let kanban = {
  columns: [
    { id: "todo", title: "To Do", tasks: [] },
    { id: "inprogresss", title: "In Progress", tasks: [] },
    { id: "done", title: "Done", tasks: [] },
  ],
};

io.on("connection", (socket) => {
  console.log("🟢 Пользователь подключился:", socket.id);

  socket.emit("kanbanState", kanban);

  socket.on("addTask", ({ columnId, title }) => {
    const column = kanban.columns.find((col) => col.id === columnId);
    if (column) {
      column.tasks.push({ id: crypto.randomUUID(), title });
      io.emit("kanbanState", kanban); // всем шлём новое состояние
    }
  });

  socket.on("moveTask", ({ taskId, toColumnId }) => {
    let task;

    // убираем таску из старой колонки
    for (const col of kanban.columns) {
      const idx = col.tasks.findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        task = col.tasks.splice(idx, 1)[0];
        break;
      }
    }

    if (task) {
      // добавляем в новую колонку
      const newCol = kanban.columns.find((c) => c.id === toColumnId);
      if (newCol) {
        newCol.tasks.push(task);
      }
    }

    io.emit("kanbanState", kanban);
  });
  socket.on("editTask", ({ taskId, title }) => {
    for (const col of kanban.columns) {
      const task = col.tasks.find((t) => t.id === taskId);
      if (task) {
        task.title = title;
        break;
      }
    }
    io.emit("kanbanState", kanban);
  });

  socket.on("removeTask", ({ taskId }) => {
    for (const col of kanban.columns) {
      col.tasks = col.tasks.filter((t) => t.id !== taskId);
    }
    io.emit("kanbanState", kanban);
  });

  socket.on("editColumn", ({ columnId, title }) => {
    const column = kanban.columns.find((c) => c.id === columnId);
    if (column) {
      column.title = title;
      io.emit("kanbanState", kanban);
    }
  });

  socket.on("removeColumn", ({ columnId }) => {
    kanban.columns = kanban.columns.filter((c) => c.id !== columnId);
    io.emit("kanbanState", kanban);
  });

  socket.on("addColumn", ({ title }) => {
    kanban.columns.push({ id: crypto.randomUUID(), title: title, tasks: [] });
    io.emit("kanbanState", kanban);
  });
});

httpServer.listen(4000, () => {
  console.log("🚀 WS сервер работает на http://localhost:4000");
});
