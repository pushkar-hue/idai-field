defmodule FieldHub.CouchService do
  defmodule Credentials do
    defstruct name: "<user_name>", password: "<user_password>"
  end

  @moduledoc """
  Bundles functions for directly interacting with the CouchDB.
  """

  require Logger

  @doc """
  Authenticate with credentials.

  Returns `:ok` if credentials are valid, otherwise `{:error, reason}`.

  __Parameters__
  - `credentials` the #{Credentials}.
  """
  def authenticate(%Credentials{} = credentials) do
    response =
      HTTPoison.get(
        "#{base_url()}/",
        headers(credentials)
      )

    case response do
      {:ok, %{status_code: 200}} ->
        :ok

      {:ok, %{status_code: 401}} ->
        {:error, 401}
    end
  end

  @doc """
  Returns the user document in CouchDB's `_users` database.

  __Parameters__
  - `user_name` the user's name.
  """
  def get_user(user_name) do
    HTTPoison.get!(
      "#{base_url()}/_users/org.couchdb.user:#{user_name}",
      get_admin_credentials()
      |> headers()
    )
  end

  @doc """
  Creates CouchDB's internal databases `_users` and `_replicator`.

  Returns a tuple with two #{HTTPoison.Response} for each creation attempt.
  """
  def initial_setup() do
    {
      HTTPoison.put!(
        "#{base_url()}/_users",
        "",
        get_admin_credentials()
        |> headers()
      ),
      HTTPoison.put!(
        "#{base_url()}/_replicator",
        "",
        get_admin_credentials()
        |> headers()
      )
    }
  end

  @doc """
  Creates a project database.

  Returns the #{HTTPoison.Response} for the creation attempt.

  __Parameters__
  - `project_name` the project's name.
  """
  def create_project(project_name) do
    HTTPoison.put!(
      "#{base_url()}/#{project_name}",
      "",
      get_admin_credentials()
      |> headers()
    )
  end

  @doc """
  Deletes the project database.

  Returns the #{HTTPoison.Response} for the deletion attempt.

  __Parameters__
  - `project_name` the project's name.
  """
  def delete_project(project_name) do
    HTTPoison.delete!(
      "#{base_url()}/#{project_name}",
      get_admin_credentials()
      |> headers()
    )
  end

  @doc """
  Creates a CouchDB user.

  Returns the #{HTTPoison.Response} for the creation attempt.

  __Parameters__
  - `name` the user's name.
  - `password` the user's password.
  """
  def create_user(name, password) do
    HTTPoison.put!(
      "#{base_url()}/_users/org.couchdb.user:#{name}",
      Jason.encode!(%{name: name, password: password, roles: [], type: "user"}),
      get_admin_credentials()
      |> headers()
    )
  end

  @doc """
  Deletes a CouchDB user.

  Returns the #{HTTPoison.Response} for the deletion attempt.

  __Parameters__
  - `name` the user's name.
  """
  def delete_user(name) do
    HTTPoison.get!(
      "#{base_url()}/_users/org.couchdb.user:#{name}",
      get_admin_credentials()
      |> headers()
    )
    |> case do
      %{status_code: 200, body: body} ->
        %{"_rev" => rev} =
          body
          |> Jason.decode!()

        HTTPoison.delete!(
          "#{base_url()}/_users/org.couchdb.user:#{name}",
          headers(get_admin_credentials()) ++ [{"If-Match", rev}]
        )

      %{status_code: 404} = response ->
        # User was not found
        response
    end
  end

  @doc """
  Sets the password for an existing CouchDB user`.

  Returns the #{HTTPoison.Response} for the update attempt.

  __Parameters__
  - `name` the user's name.
  - `new_password` the user's new password.
  """
  def update_password(name, new_password) do
    response =
      HTTPoison.get!(
        "#{base_url()}/_users/org.couchdb.user:#{name}",
        get_admin_credentials()
        |> headers()
      )

    case response do
      %{status_code: 200} = res ->
        res
        |> Map.get(:body)
        |> Jason.decode!()
        |> case do
          %{"_rev" => rev} ->
            HTTPoison.put!(
              "#{base_url()}/_users/org.couchdb.user:#{name}",
              Jason.encode!(%{name: name, password: new_password, roles: [], type: "user"}),
              headers(get_admin_credentials()) ++ [{"If-Match", rev}]
            )
            |> case do
              %{status_code: 201} = res ->
                res
            end
        end

      %{status_code: 404} = res ->
        res
    end
  end

  @doc """
  Sets a user's role within a certain project.

  Returns the #{HTTPoison.Response} for the update attempt.

  __Parameters__
  - `user_name` the user's name.
  - `project_name` the project's name.
  - `role` the users new role, one of `[:none, :member, :admin]`. If `:none` is passed, the user will be removed from all current roles in the project.
  """
  def update_user_role_in_project(
        user_name,
        project_name,
        role
      )
      when role in [:none, :member, :admin] do
    HTTPoison.get!(
      "#{base_url()}/_users/org.couchdb.user:#{user_name}",
      get_admin_credentials()
      |> headers()
    )
    |> case do
      %{status_code: 200} ->
        HTTPoison.get!(
          "#{base_url()}/#{project_name}/_security",
          get_admin_credentials()
          |> headers()
        )
        |> case do
          %{status_code: 200, body: body} ->
            %{"admins" => existing_admins, "members" => existing_members} = Jason.decode!(body)

            HTTPoison.put!(
              "#{base_url()}/#{project_name}/_security",
              user_update_payload(user_name, existing_admins, existing_members, role),
              get_admin_credentials()
              |> headers()
            )

          %{status_code: 404} = res ->
            {:unknown_project, res}
        end

      %{status_code: 404} = res ->
        {:unknown_user, res}
    end
  end

  defp user_update_payload(user_name, existing_admins, existing_members, :admin) do
    updated_names =
      (Map.get(existing_admins, "names", []) ++ [user_name])
      |> Enum.uniq()

    %{
      admins: %{
        names: updated_names,
        roles: existing_admins["roles"]
      },
      members: existing_members
    }
    |> Jason.encode!()
  end

  defp user_update_payload(user_name, existing_admins, existing_members, :member) do
    updated_names =
      (Map.get(existing_members, "names", []) ++ [user_name])
      |> Enum.uniq()

    %{
      admins: existing_admins,
      members: %{
        names: updated_names,
        roles: existing_admins["roles"]
      }
    }
    |> Jason.encode!()
  end

  defp user_update_payload(user_name, existing_admins, existing_members, :none) do
    %{
      admins: %{
        names:
          Map.get(existing_admins, "names", [])
          |> List.delete(user_name),
        roles: existing_admins["roles"]
      },
      members: %{
        names:
          Map.get(existing_members, "names", [])
          |> List.delete(user_name),
        roles: existing_members["roles"]
      }
    }
    |> Jason.encode!()
  end

  @doc """
  Returns the `_security` document in a project database.

  __Parameters__
  - `project_name` the project's name.
  """
  def get_database_security(project_name) do
    "#{base_url()}/#{project_name}/_security"
    |> HTTPoison.get!(headers())
  end

  @doc """
  Returns a list of all databases (excluding CouchDB's internal ones: `_users` and `_replicator`).
  """
  def get_all_databases() do
    "#{base_url()}/_all_dbs"
    |> HTTPoison.get!(
      get_admin_credentials()
      |> headers()
    )
    |> Map.get(:body)
    |> Jason.decode!()
    |> Stream.reject(fn val ->
      # Filter out CouchDB's internal databases.
      val in ["_replicator", "_users"]
    end)
    |> Enum.to_list()
  end

  @doc """
  Get CouchDB's basic metadata for the given project.

  __Parameters__
  - `project_name` the project's name.
  """
  def get_db_infos(project_name) do
    HTTPoison.get!(
      "#{base_url()}/#{project_name}",
      headers()
    )
  end

  @doc """
  Returns the documents for a list of UUIDs (matched against the documents `_id` values).

  Returns a list, for each requested UUID either with an element `{:ok, document}` or `{:error, %{uuid: uuid, reason: reason}}`.

  See also https://docs.couchdb.org/en/stable/api/database/bulk-api.html#db-bulk-get.

  __Parameters__
  - `project_name` the project's name.
  - `uuids` the list of ids requested.
  """
  def get_docs(project_name, uuids) do
    body =
      %{
        docs:
          uuids
          |> Enum.map(fn uuid ->
            %{id: uuid}
          end)
      }
      |> Jason.encode!()

    %{body: body} =
      HTTPoison.post!(
        "#{base_url()}/#{project_name}/_bulk_get",
        body,
        headers()
      )

    body
    |> Jason.decode!()
    |> Map.get("results")
    |> Enum.map(fn %{"docs" => result} ->
      case result do
        [%{"ok" => doc}] ->
          {:ok, doc}

        [%{"error" => %{"id" => uuid, "error" => error}}] ->
          {:error, %{uuid: uuid, reason: error}}
      end
    end)
  end

  @doc """
  Returns an #{Stream} for all documents that match the requested resource categories. Because a lazy #{Stream} is returned,
  make sure to iterate using the #{Enum} module.

  See also https://elixir-lang.org/getting-started/enumerables-and-streams.html.

  __Parameters__
  - `project_name` the project's name.
  - `categories` a list of requested categories.

  ## Example
      iex> CouchService.get_docs_by_category("development", ["Image", "Photo", "Drawing"]) |> Enum.to_list()
      [
        %{
          "_id" => "5cc25dd3-0f39-47a4-b3d8-4a74427f8c6a",
          "_rev" => "1-c656e9c8690925daaa293fe695e608a8",
          "created" => %{"date" => "2022-11-08T08:31:23.359Z", "user" => "anonymous"},
          "modified" => [],
          "resource" => %{
            "height" => 900,
            "id" => "5cc25dd3-0f39-47a4-b3d8-4a74427f8c6a",
            "identifier" => "7W7z07j.jpg",
            "originalFilename" => "7W7z07j.jpg",
            "relations" => %{},
            "type" => "Drawing",
            "width" => 1600
          }
        },
        %{
          "_id" => "7677d2d3-5dcd-4d9c-bcfb-6f6a108c1039",
          "_rev" => "1-54c34b9639e3fda7aa9005033d0a832e",
          "created" => %{"date" => "2022-12-14T11:43:07.290Z", "user" => "anonymous"},
          "modified" => [],
          "resource" => %{
            "height" => 1031,
            "id" => "7677d2d3-5dcd-4d9c-bcfb-6f6a108c1039",
            "identifier" => "field_ua.jpg",
            "originalFilename" => "field_ua.jpg",
            "relations" => %{},
            "type" => "Drawing",
            "width" => 1920
          }
        },
        %{
          "_id" => "880dbf25-ec76-481b-a47e-a7265b7b6164",
          "_rev" => "1-94ef61e6300074fc0a6ee2909e9b5402",
          "created" => %{"date" => "2022-12-14T12:52:30.122Z", "user" => "anonymous"},
          "modified" => [],
          "resource" => %{
            "height" => 1080,
            "id" => "880dbf25-ec76-481b-a47e-a7265b7b6164",
            "identifier" => "aldrin.png",
            "originalFilename" => "aldrin.png",
            "relations" => %{},
            "type" => "Photo",
            "width" => 1920
          }
        }
      ]
  """
  def get_docs_by_category(project_name, categories) do
    get_find_query_stream(project_name, %{
      selector: %{
        "$or":
          Enum.map(categories, fn category ->
            [
              %{"resource.category" => category},
              %{"resource.type" => category}
            ]
          end)
          |> List.flatten()
      }
    })
  end

  @doc """
  Returns an #{Stream} for all documents that match a CouchDB `_find` query. Because a lazy #{Stream} is returned, make sure to iterate
  using the #{Enum} module.

  See also https://elixir-lang.org/getting-started/enumerables-and-streams.html.

  __Parameters__
  - `project_name` the project's name.
  - `query` a #{Map} that can be encoded as a valid `_find` JSON query, see https://docs.couchdb.org/en/stable/api/database/find.html.
  """
  def get_find_query_stream(project_name, query) do
    batch_size = 500

    Stream.resource(
      fn ->
        query
        |> Map.put(:limit, batch_size)
      end,
      fn payload ->
        HTTPoison.post!(
          "#{base_url()}/#{project_name}/_find",
          Jason.encode!(payload),
          headers(),
          recv_timeout: 60000
        )
        |> case do
          %{status_code: 200, body: body} ->
            body
            |> Jason.decode!()
            |> case do
              %{"docs" => []} ->
                {:halt, :ok}

              %{"docs" => docs, "bookmark" => bookmark} ->
                {
                  docs
                  |> Enum.map(&replace_resource_type_with_category/1),
                  Map.put(payload, :bookmark, bookmark)
                }
            end

          error ->
            {:halt, {:error, error}}
        end
      end,
      fn final_payload ->
        case final_payload do
          {:error, error} ->
            throw(error)

          _ ->
            :ok
        end
      end
    )
  end

  defp replace_resource_type_with_category(doc) do
    # Replace 'resource.type' with 'resource.category'. 'type' will become
    # deprecated. TODO: Remove this once 'type' is not used anymore.
    case Map.get(doc, "resource") do
      nil ->
        doc

      _resource ->
        Map.update!(doc, "resource", fn resource ->
          case Map.get(resource, "type") do
            nil ->
              resource

            type_value ->
              resource
              |> Map.put_new("category", type_value)
              |> Map.delete("type")
          end
        end)
    end
  end

  defp get_admin_credentials() do
    %Credentials{
      name: Application.get_env(:field_hub, :couchdb_admin_name),
      password: Application.get_env(:field_hub, :couchdb_admin_password)
    }
  end

  defp get_user_credentials() do
    %Credentials{
      name: Application.get_env(:field_hub, :couchdb_user_name),
      password: Application.get_env(:field_hub, :couchdb_user_password)
    }
  end

  defp headers() do
    get_user_credentials()
    |> headers()
  end

  defp headers(%Credentials{name: user_name, password: user_password}) do
    credentials =
      "#{user_name}:#{user_password}"
      |> Base.encode64()

    [
      {"Content-Type", "application/json"},
      {"Authorization", "Basic #{credentials}"}
    ]
  end

  def base_url() do
    Application.get_env(:field_hub, :couchdb_url)
  end

  def create_password(length \\ 32) do
    length
    |> :crypto.strong_rand_bytes()
    |> Base.encode64()
    |> binary_part(0, length)
  end
end
